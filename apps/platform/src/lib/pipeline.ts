import { prisma } from "@/lib/prisma";
import type { Prisma, ServiceType } from "@prisma/client";
import type { SessionPayload } from "@/src/lib/auth/token";

const SERVICE_LABEL: Record<ServiceType, string> = {
  HOME_CLEAN: "Healthy Home Clean",
  PRESSURE_WASH: "Pressure Wash",
  AUTO_DETAIL: "Eco Auto Detail",
  CUSTOM: "Custom Service"
};

const STAGE_DEFINITIONS = [
  {
    id: "new",
    title: "New requests",
    subtitle: "Quote or triage needed",
    tone: "emerald",
    emptyLabel: "No open intakes"
  },
  {
    id: "awaiting_time",
    title: "Customer needs a time",
    subtitle: "Quote accepted, crew pending",
    tone: "amber",
    emptyLabel: "No customers waiting on times"
  },
  {
    id: "confirmed",
    title: "Time confirmed",
    subtitle: "Cleaner + customer aligned",
    tone: "sky",
    emptyLabel: "No confirmed visits on the board"
  },
  {
    id: "done",
    title: "Completed",
    subtitle: "Awaiting payment wrap up",
    tone: "purple",
    emptyLabel: "No unpaid completions"
  },
  {
    id: "paid",
    title: "Paid",
    subtitle: "Ready for archive",
    tone: "slate",
    emptyLabel: "No paid jobs this week"
  }
] as const;

export type PipelineStageId = (typeof STAGE_DEFINITIONS)[number]["id"];
type AccentTone = (typeof STAGE_DEFINITIONS)[number]["tone"];

type RequestWithRelations = Prisma.ServiceRequestGetPayload<{
  include: {
    quote: true;
    job: {
      include: {
        assignments: {
          include: {
            cleaner: {
              include: {
                user: { select: { id: true; firstName: true; lastName: true; email: true; phone: true } };
              };
            };
          };
        };
      };
    };
    payments: true;
    schedulingOptions: true;
  };
}>;

export type PipelineTimelineItem = {
  id: string;
  label: string;
  date: string;
  status: "done" | "current" | "pending";
};

export type PipelineHouse = {
  id: string;
  requestId: string;
  jobId: string | null;
  stageId: PipelineStageId;
  jobStatus: string;
  customer: string;
  addressLine1: string;
  city: string;
  state: string;
  service: string;
  quoteTotal: number | null;
  collected: number;
  balance: number;
  payoutAmount: number | null;
  preferredWindow?: string | null;
  preferredStart?: string | null;
  scheduledWindow?: string | null;
  scheduledStart?: string | null;
  assignmentId?: string | null;
  enRouteAt?: string | null;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  nextAction: string;
  statusBadge: {
    label: string;
    tone: "neutral" | "info" | "warning" | "positive";
  };
  cleaners: Array<{
    id: string;
    name: string;
    initials: string;
  }>;
  rescheduleCount: number;
  rescheduledLabel?: string;
  rescheduledAt?: string;
  notes?: string | null;
  tags: string[];
  timeline: PipelineTimelineItem[];
  createdAt: string;
  updatedAt: string;
};

export type PipelineMetric = {
  id: string;
  label: string;
  value: number;
  helper: string;
};

export type PipelineColumn = {
  id: PipelineStageId;
  title: string;
  subtitle: string;
  tone: AccentTone;
  emptyLabel: string;
  houses: PipelineHouse[];
};

export type PipelineBoardData = {
  viewerRole: SessionPayload["role"];
  columns: PipelineColumn[];
  metrics: PipelineMetric[];
  lastUpdated: string;
};

const STAGE_ORDER = STAGE_DEFINITIONS.map((stage, index) => ({
  ...stage,
  order: index
}));

const stageMeta: Record<PipelineStageId, (typeof STAGE_ORDER)[number]> = STAGE_ORDER.reduce(
  (acc, stage) => {
    acc[stage.id] = stage;
    return acc;
  },
  {} as Record<PipelineStageId, (typeof STAGE_ORDER)[number]>
);

const parsePreferredWindows = (windows: Prisma.JsonValue | null): Array<{ start: Date; end: Date }> => {
  if (!windows || !Array.isArray(windows)) return [];

  return windows
    .map((window) => (typeof window === "object" && window && !Array.isArray(window) ? window : null))
    .filter((entry): entry is Prisma.JsonObject => entry !== null)
    .map((entry) => {
      const start = typeof entry.start === "string" ? new Date(entry.start) : null;
      const end = typeof entry.end === "string" ? new Date(entry.end) : null;
      return start && end ? { start, end } : null;
    })
    .filter((entry): entry is { start: Date; end: Date } => Boolean(entry));
};

const formatWindowLabel = (start?: Date | null, end?: Date | null) => {
  if (!start) return null;
  const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  const startLabel = `${dateFormatter.format(start)} • ${timeFormatter.format(start)}`;
  if (!end) return startLabel;
  return `${startLabel} – ${timeFormatter.format(end)}`;
};

const formatShortWindowLabel = (start?: Date | null) =>
  start
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(start)
    : null;

const sumCaptured = (payments: RequestWithRelations["payments"]) =>
  payments.filter((payment) => payment.status === "CAPTURED").reduce((sum, payment) => sum + payment.amount, 0);

const getLatestSchedulingUpdate = (request: RequestWithRelations) => {
  if (!request.schedulingOptions.length) return null;
  return [...request.schedulingOptions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
};

const determineStage = (request: RequestWithRelations, collected: number) => {
  const total = request.quote?.total ?? 0;
  const fullyPaid = total > 0 ? collected >= total - 0.01 : collected > 0;
  const latestScheduling = getLatestSchedulingUpdate(request);
  const rescheduleCount = request.schedulingOptions.filter((option) => option.status === "DECLINED").length;

  if (latestScheduling?.status === "DECLINED") {
    return { stage: "awaiting_time" as const, rescheduledAt: latestScheduling.updatedAt, rescheduleCount };
  }

  if (request.job?.status === "COMPLETED" || request.status === "COMPLETED") {
    return { stage: fullyPaid ? ("paid" as const) : ("done" as const), rescheduledAt: undefined, rescheduleCount };
  }

  if (
    request.job?.status === "SCHEDULED" ||
    (request.job?.status === "CLAIMED" && Boolean(request.job.scheduledStart))
  ) {
    return { stage: "confirmed" as const, rescheduledAt: undefined, rescheduleCount };
  }

  if (
    request.status === "ACCEPTED" ||
    request.status === "SCHEDULED" ||
    request.job?.status === "CLAIMED" ||
    request.job?.status === "PENDING"
  ) {
    return { stage: "awaiting_time" as const, rescheduledAt: undefined, rescheduleCount };
  }

  return { stage: "new" as const, rescheduledAt: undefined, rescheduleCount };
};

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const buildTimeline = (
  request: RequestWithRelations,
  stageId: PipelineStageId,
  acceptedAt?: Date,
  scheduledAt?: Date,
  completedAt?: Date,
  paidAt?: Date
): PipelineTimelineItem[] => {
  const rank = (id: PipelineStageId) => stageMeta[id].order;
  const currentRank = rank(stageId);

  const timeline: { id: PipelineTimelineItem["id"]; label: string; date: Date | null; completeRank: number }[] = [
    { id: "requested", label: "New request", date: request.createdAt, completeRank: 0 },
    { id: "quoted", label: "Quote sent", date: request.quote?.createdAt ?? null, completeRank: 0 },
    { id: "accepted", label: "Customer accepted", date: acceptedAt ?? null, completeRank: rank("awaiting_time") },
    {
      id: "scheduled",
      label: "Cleaner confirmed time",
      date: scheduledAt ?? null,
      completeRank: rank("confirmed")
    },
    {
      id: "completed",
      label: "Visit marked done",
      date: completedAt ?? null,
      completeRank: rank("done")
    },
    {
      id: "paid",
      label: "Paid in full",
      date: paidAt ?? null,
      completeRank: rank("paid")
    }
  ];

  return timeline
    .filter((item) => item.date)
    .map((item) => {
      const status =
        currentRank > item.completeRank
          ? "done"
          : currentRank === item.completeRank
            ? "current"
            : "pending";
      return {
        id: item.id,
        label: item.label,
        date: (item.date as Date).toISOString(),
        status
      };
    });
};

type PipelineHouseWithSort = PipelineHouse & { sortValue: number };

const getStatusBadge = (
  stageId: PipelineStageId,
  options: {
    hasCleaner: boolean;
    scheduledStart?: Date | null;
    balance: number;
    rescheduleCount: number;
  }
) => {
  if (stageId === "new") {
    return {
      label: "Awaiting quote",
      tone: "info" as const
    };
  }

  if (stageId === "awaiting_time") {
    if (options.rescheduleCount > 0) {
      return {
        label: "Reschedule requested",
        tone: "warning" as const
      };
    }
    return {
      label: options.hasCleaner ? "Awaiting crew confirm" : "Assign a cleaner",
      tone: options.hasCleaner ? ("info" as const) : ("warning" as const)
    };
  }

  if (stageId === "confirmed") {
    return {
      label: options.scheduledStart ? `Set for ${formatShortWindowLabel(options.scheduledStart)}` : "Locking window",
      tone: "positive" as const
    };
  }

  if (stageId === "done") {
    return {
      label: options.balance > 0 ? `Balance $${Math.round(options.balance)}` : "QA in progress",
      tone: options.balance > 0 ? ("warning" as const) : ("info" as const)
    };
  }

  return {
    label: "Paid in full",
    tone: "positive" as const
  };
};

const nextActionForStage = (stageId: PipelineStageId, hasCleaner: boolean, rescheduleCount: number) => {
  switch (stageId) {
    case "new":
      return "Review intake and craft the quote.";
    case "awaiting_time":
      if (rescheduleCount > 0) {
        return "Share new availability options with the customer.";
      }
      return hasCleaner ? "Ping cleaner to lock a window." : "Assign a cleaner or crew.";
    case "confirmed":
      return "Send reminders and prep supplies.";
    case "done":
      return "Close out QC checklist & capture payment.";
    case "paid":
      return "Archive the visit or book the next cadence.";
    default:
      return "Keep things moving.";
  }
};

const buildHouse = (request: RequestWithRelations, focusCleanerId?: string): PipelineHouseWithSort | null => {
  const collected = sumCaptured(request.payments);
  const { stage, rescheduledAt, rescheduleCount } = determineStage(request, collected);

  if (!stage) return null;

  const service = SERVICE_LABEL[request.serviceType];
  const assignedCleaners =
    request.job?.assignments.map((assignment) => {
      const firstName = assignment.cleaner.user.firstName;
      const lastName = assignment.cleaner.user.lastName;
      const fullName = `${firstName} ${lastName}`.trim() || assignment.cleaner.user.email;
      return {
        id: assignment.cleanerId,
        name: fullName,
        initials: initialsFromName(fullName)
      };
    }) ?? [];

  const preferredWindows = parsePreferredWindows(request.preferredWindows);
  const preferredWindow =
    preferredWindows[0] ??
    (request.preferredStart ? { start: request.preferredStart, end: request.preferredEnd ?? request.preferredStart } : null);
  const preferredLabel = preferredWindow ? formatWindowLabel(preferredWindow.start, preferredWindow.end ?? null) : null;
  const scheduledStart = request.job?.scheduledStart ?? null;
  const scheduledEnd = request.job?.scheduledEnd ?? null;
  const scheduledWindow = scheduledStart ? formatWindowLabel(scheduledStart, scheduledEnd ?? null) : null;

  const primaryAssignment = request.job?.assignments
    ? focusCleanerId
      ? request.job.assignments.find((assignment) => assignment.cleanerId === focusCleanerId) ?? request.job.assignments[0]
      : request.job.assignments[0]
    : null;

  const acceptedAt =
    request.status === "ACCEPTED" || request.status === "SCHEDULED" || request.status === "COMPLETED"
      ? request.updatedAt
      : undefined;

  const completedAt = request.job?.status === "COMPLETED" ? request.job.updatedAt : undefined;
  const latestPayment = request.payments
    .filter((payment) => payment.status === "CAPTURED")
    .sort((a, b) => (b.postedAt ?? b.updatedAt).getTime() - (a.postedAt ?? a.updatedAt).getTime())[0];

  const timeline = buildTimeline(
    request,
    stage,
    acceptedAt,
    scheduledStart ?? undefined,
    completedAt,
    latestPayment?.postedAt ?? latestPayment?.createdAt
  );

  const nextAction = nextActionForStage(stage, assignedCleaners.length > 0, rescheduleCount);
  const statusBadge = getStatusBadge(stage, {
    hasCleaner: assignedCleaners.length > 0,
    scheduledStart: request.job?.scheduledStart ?? undefined,
    balance: Math.max((request.quote?.total ?? 0) - collected, 0),
    rescheduleCount
  });

  const tags = [
    service,
    `${request.city}, ${request.state}`,
    request.squareFootage ? `${request.squareFootage.toLocaleString()} sq ft` : null
  ].filter((tag): tag is string => Boolean(tag));

  const sortValue = (() => {
    if (stage === "new") return request.createdAt.getTime();
    if (stage === "awaiting_time") return request.updatedAt.getTime();
    if (stage === "confirmed") return request.job?.scheduledStart?.getTime() ?? request.updatedAt.getTime();
    if (stage === "done") return request.job?.updatedAt?.getTime() ?? request.updatedAt.getTime();
    return latestPayment?.postedAt?.getTime() ?? latestPayment?.updatedAt.getTime() ?? request.updatedAt.getTime();
  })();

  return {
    id: request.id,
    requestId: request.id,
    jobId: request.job?.id ?? null,
    stageId: stage,
    jobStatus: request.job?.status ?? "PENDING",
    customer: request.customerName,
    addressLine1: request.addressLine1,
    city: request.city,
    state: request.state,
    service,
    quoteTotal: request.quote?.total ?? null,
    collected,
    balance: Math.max((request.quote?.total ?? 0) - collected, 0),
    payoutAmount: request.job?.payoutAmount ?? null,
    preferredWindow: preferredLabel,
    preferredStart: preferredWindow?.start?.toISOString() ?? null,
    scheduledWindow,
    scheduledStart: scheduledStart?.toISOString() ?? null,
    assignmentId: primaryAssignment?.id ?? null,
    enRouteAt: primaryAssignment?.enRouteAt?.toISOString() ?? null,
    clockInAt: primaryAssignment?.clockInAt?.toISOString() ?? null,
    clockOutAt: primaryAssignment?.clockOutAt?.toISOString() ?? null,
    nextAction,
    statusBadge,
    cleaners: assignedCleaners,
    rescheduleCount,
    rescheduledLabel: rescheduledAt ? formatShortWindowLabel(rescheduledAt) ?? undefined : undefined,
    rescheduledAt: rescheduledAt?.toISOString(),
    notes: request.notes ?? null,
    tags,
    timeline,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    sortValue
  };
};

const emptyBoard = (role: SessionPayload["role"]): PipelineBoardData => ({
  viewerRole: role,
  columns: STAGE_DEFINITIONS.map((stage) => ({
    id: stage.id,
    title: stage.title,
    subtitle: stage.subtitle,
    tone: stage.tone,
    emptyLabel: stage.emptyLabel,
    houses: []
  })),
  metrics: [
    { id: "active", label: "Active houses", value: 0, helper: "Requests in your pipeline" },
    { id: "awaiting", label: "Need a confirmed time", value: 0, helper: "Customers waiting on a slot" },
    { id: "confirmed", label: "Confirmed this week", value: 0, helper: "Visits set for the next 7 days" },
    { id: "reschedules", label: "Recent reschedules", value: 0, helper: "Homes sent back to scheduling" }
  ],
  lastUpdated: new Date().toISOString()
});

export const getPipelineBoardData = async (session: SessionPayload): Promise<PipelineBoardData> => {
  const viewer = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tenantId: true }
  });

  if (!viewer) {
    return emptyBoard(session.role);
  }

  const tenantId = viewer.tenantId;

  let cleanerProfileId: string | null = null;

  if (session.role === "CLEANER") {
    const profile = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId }
    });

    if (!profile) {
      return emptyBoard(session.role);
    }

    cleanerProfileId = profile.id;
  }

  const requests = await prisma.serviceRequest.findMany({
    where: {
      tenantId,
      status: {
        not: "CANCELED"
      },
      ...(cleanerProfileId
        ? {
            job: {
              assignments: {
                some: {
                  cleanerId: cleanerProfileId
                }
              }
            }
          }
        : {})
    },
    include: {
      quote: true,
      job: {
        include: {
          assignments: {
            include: {
              cleaner: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
                }
              }
            }
          }
        }
      },
      payments: true,
      schedulingOptions: true
    },
    orderBy: { createdAt: "desc" },
    take: 160
  });

  if (!requests.length) {
    return emptyBoard(session.role);
  }

  const columnsMap: Record<PipelineStageId, PipelineHouseWithSort[]> = {
    new: [],
    awaiting_time: [],
    confirmed: [],
    done: [],
    paid: []
  };

  requests.forEach((request) => {
    const house = buildHouse(request, cleanerProfileId ?? undefined);
    if (!house) return;
    columnsMap[house.stageId].push(house);
  });

  const columns: PipelineColumn[] = STAGE_DEFINITIONS.map((stage) => {
    const houses = columnsMap[stage.id]
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((house) => {
        const { sortValue: _sortValue, ...rest } = house;
        return rest;
      });
    return {
      id: stage.id,
      title: stage.title,
      subtitle: stage.subtitle,
      tone: stage.tone,
      emptyLabel: stage.emptyLabel,
      houses
    };
  });

  const awaitingCount = columnsMap.awaiting_time.length;
  const confirmedWithinWeek = columnsMap.confirmed.filter((house) => {
    if (!house.scheduledStart) return false;
    const scheduledDate = new Date(house.scheduledStart);
    if (Number.isNaN(scheduledDate.getTime())) return false;
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(now.getDate() + 7);
    return scheduledDate <= weekAhead && scheduledDate >= now;
  }).length;

  const rescheduleTotal = Object.values(columnsMap)
    .flat()
    .filter((house) => house.rescheduleCount > 0).length;

  const activeCount = requests.length;

  const metrics: PipelineMetric[] = [
    { id: "active", label: "Active houses", value: activeCount, helper: "Requests in your pipeline" },
    { id: "awaiting", label: "Need a confirmed time", value: awaitingCount, helper: "Customers waiting on a slot" },
    { id: "confirmed", label: "Confirmed this week", value: confirmedWithinWeek, helper: "Visits inside 7 days" },
    { id: "reschedules", label: "Recent reschedules", value: rescheduleTotal, helper: "Homes bounced back" }
  ];

  return {
    viewerRole: session.role,
    columns,
    metrics,
    lastUpdated: new Date().toISOString()
  };
};
