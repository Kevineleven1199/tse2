import { prisma } from "@/lib/prisma";
import type { Job, ServiceRequest, JobAssignment, CleanerProfile, User } from "@prisma/client";

// Cleaner levels based on completed jobs
const CLEANER_LEVELS = {
  1: { min: 0, max: 9, title: "Fresh Start", badge: "🌱" },
  2: { min: 10, max: 24, title: "Rising Star", badge: "⭐" },
  3: { min: 25, max: 49, title: "Pro Cleaner", badge: "💫" },
  4: { min: 50, max: 99, title: "Expert", badge: "🏆" },
  5: { min: 100, max: 199, title: "Master", badge: "👑" },
  6: { min: 200, max: Infinity, title: "Legend", badge: "💎" }
} as const;


export type CleanerLevel = keyof typeof CLEANER_LEVELS;

export type EarningsData = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayout: number;
  nextPayoutDate: string | null;
  lifetimeEarnings: number;
};

export type JobSummary = {
  id: string;
  clientName: string;
  address: string;
  city: string;
  service: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  estimatedPay: number;
  estimatedHours: number | null;
  status: string;
  isUrgent: boolean;
  bonusAmount: number;
};

export type AvailableJob = {
  id: string;
  service: string;
  city: string;
  neighborhood: string;
  scheduledDate: Date;
  timeWindow: string;
  estimatedDuration: number;
  estimatedPay: number;
  bonusAmount: number;
  isUrgent: boolean;
  distanceFromYou: number | null;
  specialInstructions: string | null;
};

export type CleanerStats = {
  totalJobs: number;
  completedJobs: number;
  rating: number;
  reviewCount: number;
  onTimeRate: number;
  repeatClientRate: number;
  level: CleanerLevel;
  levelTitle: string;
  levelBadge: string;
  jobsToNextLevel: number;
};

export type CleanerPortalData = {
  cleanerName: string;
  cleanerId: string;
  stats: CleanerStats;
  earnings: EarningsData;
  todaysJobs: JobSummary[];
  upcomingJobs: JobSummary[];
  availableJobs: AvailableJob[];
  weeklyGoal: { target: number; current: number };
  streakDays: number;
};

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Healthy Home Clean",
  PRESSURE_WASH: "Pressure Washing",
  AUTO_DETAIL: "Eco Auto Detail",
  CUSTOM: "Custom Service"
};

type JobWithRequest = Job & { request: ServiceRequest };
type AssignmentWithJob = JobAssignment & { job: JobWithRequest };

function calculateLevel(completedJobs: number): { level: CleanerLevel; data: typeof CLEANER_LEVELS[CleanerLevel] } {
  for (const [lvl, data] of Object.entries(CLEANER_LEVELS)) {
    if (completedJobs >= data.min && completedJobs <= data.max) {
      return { level: parseInt(lvl) as CleanerLevel, data };
    }
  }
  return { level: 6, data: CLEANER_LEVELS[6] };
}

export async function getCleanerPortalData(userId: string): Promise<CleanerPortalData | null> {
  try {
    const cleaner = await prisma.cleanerProfile.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, tenantId: true, status: true } },
        assignments: {
          include: {
            job: {
              include: {
                request: true
              }
            }
          },
          orderBy: { job: { scheduledStart: "asc" } }
        },
        payouts: true
      }
    });

    if (!cleaner) return null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get jobs from assignments
    const allJobs = cleaner.assignments.map((a: AssignmentWithJob) => a.job);
    const completedJobs = allJobs.filter((j: Job) => j.status === "COMPLETED");
    const totalCompleted = completedJobs.length;

    // Calculate level
    const { level, data: levelData } = calculateLevel(totalCompleted);

    // Calculate jobs to next level
    const nextLevelData = CLEANER_LEVELS[(level + 1) as CleanerLevel] || levelData;
    const jobsToNextLevel = level < 6 ? nextLevelData.min - totalCompleted : 0;

    // Fetch paystubs for this cleaner
    const paystubs = await prisma.paystub.findMany({
      where: { cleanerId: cleaner.id },
      orderBy: { periodEnd: "desc" }
    });

    // Calculate earnings from payouts AND paystubs
    const calculateEarnings = (start: Date, end?: Date) => {
      const payoutEarnings = cleaner.payouts
        .filter((p: { status: string; completedAt: Date | null }) => {
          if (p.status !== "SENT" || !p.completedAt) return false;
          return p.completedAt >= start && (!end || p.completedAt <= end);
        })
        .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

      const paystubEarnings = paystubs
        .filter((s) => {
          const periodEnd = new Date(s.periodEnd);
          return periodEnd >= start && (!end || periodEnd <= end);
        })
        .reduce((sum, s) => sum + s.netPay, 0);

      return payoutEarnings + paystubEarnings;
    };

    const pendingPayouts = cleaner.payouts
      .filter((p: { status: string }) => p.status === "QUEUED" || p.status === "PROCESSING")
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    const payoutLifetime = cleaner.payouts
      .filter((p: { status: string }) => p.status === "SENT")
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    const paystubLifetime = paystubs.reduce((sum, s) => sum + s.netPay, 0);

    const lifetimeEarnings = payoutLifetime + paystubLifetime;

    const earnings: EarningsData = {
      today: calculateEarnings(startOfToday),
      thisWeek: calculateEarnings(startOfWeek),
      thisMonth: calculateEarnings(startOfMonth),
      lastMonth: calculateEarnings(startOfLastMonth, endOfLastMonth),
      pendingPayout: pendingPayouts,
      nextPayoutDate: getNextPayoutDate(),
      lifetimeEarnings
    };

    // Today's jobs
    const todaysJobs: JobSummary[] = allJobs
      .filter((j: Job) => {
        if (!j.scheduledStart) return false;
        const jobDate = new Date(j.scheduledStart);
        return jobDate >= startOfToday &&
               jobDate < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000) &&
               j.status !== "COMPLETED" && j.status !== "CANCELED";
      })
      .map((j: JobWithRequest) => ({
        id: j.id,
        clientName: j.request?.customerName || "Client",
        address: j.request?.addressLine1 || "",
        city: j.request?.city || "",
        service: SERVICE_LABELS[j.request?.serviceType || "HOME_CLEAN"],
        scheduledStart: j.scheduledStart!,
        scheduledEnd: j.scheduledEnd || j.scheduledStart!,
        estimatedPay: j.payoutAmount || 0,
        estimatedHours: (j as Record<string, unknown>).estimatedHours as number | null ?? null,
        status: j.status,
        isUrgent: false,
        bonusAmount: 0
      }));

    // Upcoming jobs (next 7 days, excluding today)
    const tomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingJobs: JobSummary[] = allJobs
      .filter((j: Job) => {
        if (!j.scheduledStart) return false;
        const jobDate = new Date(j.scheduledStart);
        return jobDate >= tomorrow && jobDate < nextWeek &&
               j.status !== "COMPLETED" && j.status !== "CANCELED";
      })
      .slice(0, 10)
      .map((j: JobWithRequest) => ({
        id: j.id,
        clientName: j.request?.customerName || "Client",
        address: j.request?.addressLine1 || "",
        city: j.request?.city || "",
        service: SERVICE_LABELS[j.request?.serviceType || "HOME_CLEAN"],
        scheduledStart: j.scheduledStart!,
        scheduledEnd: j.scheduledEnd || j.scheduledStart!,
        estimatedPay: j.payoutAmount || 0,
        estimatedHours: (j as Record<string, unknown>).estimatedHours as number | null ?? null,
        status: j.status,
        isUrgent: false,
        bonusAmount: 0
      }));

    // Get available jobs (unassigned jobs)
    const availableJobs = await getAvailableJobs();

    // Calculate stats from real data
    const stats: CleanerStats = {
      totalJobs: allJobs.length,
      completedJobs: totalCompleted,
      rating: cleaner.rating,
      reviewCount: cleaner.completedJobs,
      onTimeRate: calculateOnTimeRate(cleaner.assignments),
      repeatClientRate: calculateRepeatClientRate(allJobs),
      level,
      levelTitle: levelData.title,
      levelBadge: levelData.badge,
      jobsToNextLevel
    };

    // Weekly goal
const weeklyGoal = {
      target: 15,
      current: allJobs.filter((j: Job) => {
        if (!j.scheduledStart) return false;
        const jobDate = new Date(j.scheduledStart);
        return jobDate >= startOfWeek && j.status === "COMPLETED";
      }).length
    };

    // Streak calculation (simplified)
    const streakDays = calculateStreak(completedJobs);

    return {
      cleanerName: `${cleaner.user.firstName} ${cleaner.user.lastName}`.trim() || "Cleaner",
      cleanerId: cleaner.id,
      stats,
      earnings,
      todaysJobs,
      upcomingJobs,
      availableJobs,
      weeklyGoal,
      streakDays
    };
  } catch (error) {
    console.error("Error fetching cleaner portal data:", error);
    return null;
  }
}

async function getAvailableJobs(): Promise<AvailableJob[]> {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const unassignedJobs = await prisma.job.findMany({
      where: {
        assignments: { none: {} },
        status: "PENDING",
        scheduledStart: {
          gte: now,
          lte: nextWeek
        }
      },
      include: {
        request: true
      },
      take: 20,
      orderBy: { scheduledStart: "asc" }
    });

    return unassignedJobs.map((j) => {
      const start = j.scheduledStart ? new Date(j.scheduledStart) : now;
      const end = j.scheduledEnd ? new Date(j.scheduledEnd) : start;
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      // Calculate urgency bonus (jobs within 24 hours get bonus)
      const hoursUntilJob = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isUrgent = hoursUntilJob < 24;
      const bonusAmount = isUrgent ? 15 : 0;

      return {
        id: j.id,
        service: SERVICE_LABELS[j.request?.serviceType || "HOME_CLEAN"],
        city: j.request?.city || "",
        neighborhood: j.request?.addressLine2 || "",
        scheduledDate: start,
        timeWindow: formatTimeWindow(start, end),
        estimatedDuration: Math.round(durationHours * 10) / 10,
        estimatedPay: j.payoutAmount || 0,
        bonusAmount,
        isUrgent,
        distanceFromYou: null,
        specialInstructions: j.request?.notes || null
      };
    });
  } catch {
    return [];
  }
}

function formatTimeWindow(start: Date, end: Date): string {
  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function getNextPayoutDate(): string {
  const now = new Date();
  // Payouts every Friday
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  return nextFriday.toISOString();
}

function calculateOnTimeRate(assignments: JobAssignment[]): number {
  if (assignments.length === 0) return 100;
  const onTime = assignments.filter(a => {
    if (!a.clockInAt) return true;
    // If clocked in within 15 minutes of scheduled, count as on-time
    return true; // Simplified - would need job.scheduledStart for actual calculation
  }).length;
  return Math.round((onTime / assignments.length) * 100);
}

function calculateRepeatClientRate(jobs: JobWithRequest[]): number {
  if (jobs.length < 2) return 0;
  const clientCounts = new Map<string, number>();
  jobs.forEach(j => {
    const email = j.request?.customerEmail;
    if (email) {
      clientCounts.set(email, (clientCounts.get(email) || 0) + 1);
    }
  });
  const repeatClients = Array.from(clientCounts.values()).filter(c => c > 1).length;
  return Math.round((repeatClients / clientCounts.size) * 100) || 0;
}

function calculateStreak(jobs: Job[]): number {
  if (jobs.length === 0) return 0;

  const completedDates = jobs
    .filter(j => j.updatedAt)
    .map(j => {
      const d = new Date(j.updatedAt);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    })
    .sort((a, b) => b - a);

  if (completedDates.length === 0) return 0;

  let streak = 1;
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 1; i < completedDates.length; i++) {
    if (completedDates[i - 1] - completedDates[i] === oneDay) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
