export const dynamic = "force-dynamic";

import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user to get their email, then get their addresses
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const addresses = await prisma.customerAddress.findMany({
      where: { customerEmail: user.email },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(addresses);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}
