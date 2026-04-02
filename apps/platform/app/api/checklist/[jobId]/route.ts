import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

// Dynamic checklists per service type — rooms and tasks
const SERVICE_CHECKLISTS: Record<string, { room: string; tasks: string[] }[]> = {
  HOME_CLEAN: [
    { room: "Kitchen", tasks: ["Wipe counters & backsplash", "Clean sink & faucet", "Appliance exteriors", "Wipe cabinet fronts", "Sweep & mop floor", "Empty trash"] },
    { room: "Bathrooms", tasks: ["Scrub toilet inside & out", "Clean shower/tub", "Wipe mirrors", "Clean sink & vanity", "Mop floor", "Restock supplies if provided"] },
    { room: "Bedrooms", tasks: ["Make beds", "Dust all surfaces", "Vacuum carpet/mop floor", "Empty trash", "Wipe light switches"] },
    { room: "Living Areas", tasks: ["Dust furniture & shelves", "Vacuum/mop floors", "Wipe light switches", "Straighten cushions", "Clean glass surfaces"] },
    { room: "General", tasks: ["HEPA vacuum all carpeted areas", "Wipe all baseboards", "Dust ceiling fans", "Check all rooms for missed spots", "Take after photos"] },
  ],
  PRESSURE_WASH: [
    { room: "Driveway", tasks: ["Pre-rinse surface", "Apply eco detergent", "Pressure wash full area", "Edge cleanup"] },
    { room: "Patio & Lanai", tasks: ["Clear furniture", "Wash floor surface", "Clean screens if applicable", "Rinse surrounding area"] },
    { room: "Exterior Walls", tasks: ["Pre-wet landscaping", "Low-pressure wash walls", "Spot treat stains", "Final rinse"] },
    { room: "Pool Deck", tasks: ["Pressure wash deck surface", "Clean drain areas", "Rinse into grass not pool"] },
  ],
  AUTO_DETAIL: [
    { room: "Exterior", tasks: ["Hand wash body", "Clean wheels & tires", "Dry with microfiber", "Apply tire dressing"] },
    { room: "Interior", tasks: ["Vacuum all surfaces", "Wipe dashboard & console", "Clean door panels", "Clean cup holders", "Wipe steering wheel"] },
    { room: "Glass", tasks: ["Clean all windows inside", "Clean all windows outside", "Clean mirrors"] },
  ],
  CUSTOM: [
    { room: "Assessment", tasks: ["Walk through with client", "Note special requests", "Identify priority areas"] },
    { room: "Execution", tasks: ["Complete custom scope", "Detail work on focus areas", "Final inspection"] },
  ],
};

// Fallback for any service type
const DEFAULT_CHECKLIST = SERVICE_CHECKLISTS.HOME_CLEAN;

/**
 * GET /api/checklist/[jobId]
 * Get checklist items for a job. Auto-creates from service template if none exist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;

  // Check job exists and user has access
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, tenantId: true, request: { select: { serviceType: true, notes: true } } },
  });

  if (!job || job.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Get existing checklist items
  let items = await prisma.jobChecklistItem.findMany({
    where: { jobId },
    orderBy: [{ room: "asc" }, { sortOrder: "asc" }],
  });

  // If no items exist, auto-create from service template
  if (items.length === 0) {
    const serviceType = job.request.serviceType;
    const template = SERVICE_CHECKLISTS[serviceType] ?? DEFAULT_CHECKLIST;

    const createData = template.flatMap((section, sectionIdx) =>
      section.tasks.map((task, taskIdx) => ({
        jobId,
        room: section.room,
        task,
        sortOrder: sectionIdx * 100 + taskIdx,
        completed: false,
      }))
    );

    await prisma.jobChecklistItem.createMany({ data: createData });
    items = await prisma.jobChecklistItem.findMany({
      where: { jobId },
      orderBy: [{ room: "asc" }, { sortOrder: "asc" }],
    });
  }

  // Group by room
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    if (!grouped[item.room]) grouped[item.room] = [];
    grouped[item.room].push(item);
  }

  const totalTasks = items.length;
  const completedTasks = items.filter((i) => i.completed).length;

  return NextResponse.json({
    jobId,
    serviceType: job.request.serviceType,
    customerNotes: job.request.notes,
    rooms: Object.entries(grouped).map(([room, tasks]) => ({
      room,
      tasks: tasks.map((t) => ({
        id: t.id,
        task: t.task,
        completed: t.completed,
        completedAt: t.completedAt?.toISOString(),
        notes: t.notes,
      })),
      progress: tasks.filter((t) => t.completed).length / tasks.length,
    })),
    progress: totalTasks > 0 ? completedTasks / totalTasks : 0,
    totalTasks,
    completedTasks,
  });
}

/**
 * PUT /api/checklist/[jobId]
 * Update checklist items (toggle completion, add notes)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  const body = await request.json();
  const { itemId, completed, notes } = body;

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  // Verify ownership
  const item = await prisma.jobChecklistItem.findUnique({ where: { id: itemId } });
  if (!item || item.jobId !== jobId) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const updated = await prisma.jobChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(completed !== undefined ? { completed, completedAt: completed ? new Date() : null } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    task: updated.task,
    completed: updated.completed,
    completedAt: updated.completedAt?.toISOString(),
    notes: updated.notes,
  });
}
