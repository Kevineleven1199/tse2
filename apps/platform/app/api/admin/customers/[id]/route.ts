import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";


export const dynamic = "force-dynamic";

const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

interface ServiceHistoryItem {
  id: string;
  date: string;
  service: string;
  amount: number;
  status: string;
  cleaner?: string;
  rating?: number;
}

interface FinancialSummary {
  lifetime: number;
  avgJobValue: number;
  outstandingBalance: number;
  lastPaymentDate?: string;
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  method: string;
  date: string;
  isDeposit: boolean;
}

interface CrmLeadData {
  id: string;
  source: string;
  status: string;
  priority: number;
  lifecycleStage: string;
  lastContacted?: string;
  lifetimeValue: number;
  totalBookings: number;
}

interface CustomerDetailResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  totalJobs: number;
  totalSpent: number;
  lastService?: string;
  status: "Active" | "Inactive" | "New";
  tags: string[];
  createdAt: string;
  serviceHistory: ServiceHistoryItem[];
  payments: PaymentItem[];
  crmLead?: CrmLeadData;
  financialSummary: FinancialSummary;
  notes: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check session and authorization
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const { id } = await context.params;
    const customerId = id;

    // Fetch customer user
    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        tenantId,
        role: "CUSTOMER",
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Fetch service requests for this customer with all related data
    const requests = await prisma.serviceRequest.findMany({
      where: {
        customerEmail: customer.email,
        tenantId,
      },
      include: {
        quote: true,
        job: {
          include: {
            assignments: {
              include: {
                cleaner: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch CRM lead data
    const crmLead = await prisma.crmLead.findFirst({
      where: {
        contactEmail: customer.email,
        tenantId,
      },
    });

    // Calculate financial summary
    const totalSpent = requests
      .reduce((sum, r) => sum + (r.quote?.total || 0), 0);

    const avgJobValue = requests.length > 0 ? totalSpent / requests.length : 0;

    const lastService = requests.find((r) => r.job)?.createdAt;

    // Get total payments captured
    const totalPaymentsCaptured = requests
      .flatMap((r) => r.payments)
      .filter((p) => p.status === "CAPTURED")
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingBalance = totalSpent - totalPaymentsCaptured;

    // Build service history
    const serviceHistory: ServiceHistoryItem[] = requests.map((r) => ({
      id: r.id,
      date: r.createdAt.toISOString(),
      service: r.serviceType,
      amount: r.quote?.total || 0,
      status: r.status,
      cleaner: r.job?.assignments[0]
        ? `${r.job.assignments[0].cleaner.user.firstName} ${r.job.assignments[0].cleaner.user.lastName}`
        : undefined,
    }));

    // Build payments list
    const payments: PaymentItem[] = requests
      .flatMap((r) => r.payments)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.provider,
        date: p.createdAt.toISOString(),
        isDeposit: p.deposit,
      }));

    const response: CustomerDetailResponse = {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || undefined,
      totalJobs: requests.filter((r) => r.job).length,
      totalSpent,
      lastService: lastService?.toISOString(),
      status: requests.length > 0 ? "Active" : "New",
      tags: [],
      createdAt: customer.createdAt.toISOString(),
      serviceHistory,
      payments,
      financialSummary: {
        lifetime: totalSpent,
        avgJobValue,
        outstandingBalance,
        lastPaymentDate: lastService?.toISOString(),
      },
      notes: "",
    };

    // Add CRM lead if available
    if (crmLead) {
      response.crmLead = {
        id: crmLead.id,
        source: crmLead.source,
        status: crmLead.status,
        priority: crmLead.priority,
        lifecycleStage: crmLead.lifecycleStage,
        lastContacted: crmLead.lastContactedAt?.toISOString(),
        lifetimeValue: crmLead.lifetimeValue,
        totalBookings: crmLead.totalBookings,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const { id } = await context.params;
    const body = await request.json();
    const data = updateCustomerSchema.parse(body);

    // Verify customer exists and belongs to tenant
    const customer = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: "CUSTOMER",
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      message: "Customer updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Update customer error:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const { id } = await context.params;

    // Verify customer exists and belongs to tenant
    const customer = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: "CUSTOMER",
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting status to inactive
    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: "inactive",
      },
    });

    return NextResponse.json({
      message: "Customer soft-deleted successfully",
      id: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
