import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { createInvoiceFromJob, generateInvoiceNumber } from "@/src/lib/invoice-generator";


export const dynamic = "force-dynamic";

const createInvoiceSchema = z.object({
  jobId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })),
  subtotal: z.number().nonnegative(),
  taxRate: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

    const where: any = { tenantId };

    if (status && status !== "All") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { customerEmail: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { invoiceNumber: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: {
        [sortBy]: sortDir,
      },
    });

    // Calculate stats
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const paidCount = invoices.filter((inv) => inv.status === "PAID").length;
    const overdueCount = invoices.filter((inv) => inv.status === "OVERDUE").length;

    return NextResponse.json({
      invoices,
      stats: {
        totalInvoices,
        totalRevenue,
        totalPaid,
        paidCount,
        overdueCount,
        avgInvoiceValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/invoices] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    const json = await request.json();
    const payload = createInvoiceSchema.parse(json);

    // If jobId provided, create from job
    if (payload.jobId) {
      const invoice = await createInvoiceFromJob(payload.jobId, tenantId);
      return NextResponse.json(invoice, { status: 201 });
    }

    // Otherwise create manually
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: generateInvoiceNumber(),
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        lineItems: payload.lineItems as any,
        subtotal: payload.subtotal,
        taxRate: payload.taxRate,
        taxAmount: payload.taxAmount,
        discountAmount: payload.discountAmount,
        total: payload.total,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        notes: payload.notes,
        status: "DRAFT",
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/invoices] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
