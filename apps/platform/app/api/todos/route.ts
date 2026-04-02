/**
 * To-Do List API — Shared + Personal
 * GET  /api/todos   → List todos (personal + shared)
 * POST /api/todos   → Create, update, toggle, or delete a todo
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = session.userId;
    const view = searchParams.get("view") || "all"; // all, personal, shared, assigned
    const showCompleted = searchParams.get("showCompleted") === "true";
    const category = searchParams.get("category");

    const where: any = {};

    if (!showCompleted) where.completed = false;
    if (category) where.category = category;

    if (view === "personal") {
      where.userId = userId;
      where.isShared = false;
    } else if (view === "shared") {
      where.isShared = true;
    } else if (view === "assigned") {
      where.assignedTo = userId;
    } else {
      // "all" = personal + shared + assigned to me
      where.OR = [
        { userId, isShared: false },
        { isShared: true },
        { assignedTo: userId },
      ];
    }

    const todos = await prisma.todoItem.findMany({
      where,
      orderBy: [{ completed: "asc" }, { priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    const stats = {
      total: todos.length,
      completed: todos.filter((t) => t.completed).length,
      overdue: todos.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length,
      urgent: todos.filter((t) => t.priority === 1 && !t.completed).length,
    };

    return NextResponse.json({ todos, stats });
  } catch (error: any) {
    console.error("[todos] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "create") {
      const todo = await prisma.todoItem.create({
        data: {
          tenantId: session.tenantId || "default",
          userId: session.userId,
          title: data.title,
          description: data.description,
          priority: data.priority || 2,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          isShared: data.isShared || false,
          assignedTo: data.assignedTo,
          category: data.category,
          relatedId: data.relatedId,
          relatedType: data.relatedType,
        },
      });
      return NextResponse.json({ todo });
    }

    if (action === "toggle" && id) {
      const existing = await prisma.todoItem.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const todo = await prisma.todoItem.update({
        where: { id },
        data: {
          completed: !existing.completed,
          completedAt: existing.completed ? null : new Date(),
        },
      });
      return NextResponse.json({ todo });
    }

    if (action === "update" && id) {
      const todo = await prisma.todoItem.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          isShared: data.isShared,
          assignedTo: data.assignedTo,
          category: data.category,
        },
      });
      return NextResponse.json({ todo });
    }

    if (action === "delete" && id) {
      await prisma.todoItem.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[todos] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
