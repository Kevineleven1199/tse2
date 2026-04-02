import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { CancellationFeeType } from "@prisma/client";

export const dynamic = "force-dynamic";

// Validation schemas
const createPolicySchema = z.object({
  hoursBeforeJob: z.number().int().positive("Hours must be positive"),
  feeType: z.enum(["FLAT", "PERCENTAGE"] as const),
  feeValue: z.number().positive("Fee value must be positive"),
});

const updatePolicySchema = z.object({
  id: z.string().cuid(),
  hoursBeforeJob: z.number().int().positive("Hours must be positive"),
  feeType: z.enum(["FLAT", "PERCENTAGE"] as const),
  feeValue: z.number().positive("Fee value must be positive"),
  active: z.boolean(),
});

const deletePolicySchema = z.object({
  id: z.string().cuid(),
});

type CreatePolicyInput = z.infer<typeof createPolicySchema>;
type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
type DeletePolicyInput = z.infer<typeof deletePolicySchema>;

interface CancellationPolicyResponse {
  id: string;
  hoursBeforeJob: number;
  feeType: CancellationFeeType;
  feeValue: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// GET: List all cancellation policies for tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - No session" },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;

    // Fetch all active and inactive policies, sorted by hoursBeforeJob ascending
    const policies = await prisma.cancellationPolicy.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        hoursBeforeJob: "asc",
      },
    });

    const response: CancellationPolicyResponse[] = policies.map((policy) => ({
      id: policy.id,
      hoursBeforeJob: policy.hoursBeforeJob,
      feeType: policy.feeType,
      feeValue: policy.feeValue,
      active: policy.active,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      policies: response,
      total: response.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/cancellation-policies] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cancellation policies" },
      { status: 500 }
    );
  }
}

// POST: Create new policy or handle update/delete actions
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

    // Check if this is an update or delete action
    const action = json.action;

    if (action === "update") {
      // UPDATE: Update existing policy
      const payload = updatePolicySchema.parse(json);

      // Verify the policy belongs to this tenant
      const existingPolicy = await prisma.cancellationPolicy.findUnique({
        where: { id: payload.id },
      });

      if (!existingPolicy || existingPolicy.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Policy not found or access denied" },
          { status: 404 }
        );
      }

      const updatedPolicy = await prisma.cancellationPolicy.update({
        where: { id: payload.id },
        data: {
          hoursBeforeJob: payload.hoursBeforeJob,
          feeType: payload.feeType,
          feeValue: payload.feeValue,
          active: payload.active,
        },
      });

      const response: CancellationPolicyResponse = {
        id: updatedPolicy.id,
        hoursBeforeJob: updatedPolicy.hoursBeforeJob,
        feeType: updatedPolicy.feeType,
        feeValue: updatedPolicy.feeValue,
        active: updatedPolicy.active,
        createdAt: updatedPolicy.createdAt.toISOString(),
        updatedAt: updatedPolicy.updatedAt.toISOString(),
      };

      return NextResponse.json(
        {
          policy: response,
          message: "Policy updated successfully",
        },
        { status: 200 }
      );
    }

    if (action === "delete") {
      // DELETE: Soft delete (set active=false)
      const payload = deletePolicySchema.parse(json);

      // Verify the policy belongs to this tenant
      const existingPolicy = await prisma.cancellationPolicy.findUnique({
        where: { id: payload.id },
      });

      if (!existingPolicy || existingPolicy.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Policy not found or access denied" },
          { status: 404 }
        );
      }

      const deletedPolicy = await prisma.cancellationPolicy.update({
        where: { id: payload.id },
        data: {
          active: false,
        },
      });

      return NextResponse.json(
        {
          message: "Policy deleted successfully",
          policy: {
            id: deletedPolicy.id,
            active: deletedPolicy.active,
          },
        },
        { status: 200 }
      );
    }

    // CREATE: No action specified, create new policy
    const payload = createPolicySchema.parse(json);

    // Check if a policy with the same hoursBeforeJob already exists for this tenant
    const existingPolicy = await prisma.cancellationPolicy.findFirst({
      where: {
        tenantId,
        hoursBeforeJob: payload.hoursBeforeJob,
        active: true,
      },
    });

    if (existingPolicy) {
      return NextResponse.json(
        { error: "A policy with this hours threshold already exists" },
        { status: 409 }
      );
    }

    const newPolicy = await prisma.cancellationPolicy.create({
      data: {
        tenantId,
        name: `${payload.feeType === "FLAT" ? "$" : ""}${payload.feeValue}${payload.feeType === "PERCENTAGE" ? "%" : ""} - ${payload.hoursBeforeJob}h`,
        hoursBeforeJob: payload.hoursBeforeJob,
        feeType: payload.feeType as CancellationFeeType,
        feeValue: payload.feeValue,
      },
    });

    const response: CancellationPolicyResponse = {
      id: newPolicy.id,
      hoursBeforeJob: newPolicy.hoursBeforeJob,
      feeType: newPolicy.feeType,
      feeValue: newPolicy.feeValue,
      active: newPolicy.active,
      createdAt: newPolicy.createdAt.toISOString(),
      updatedAt: newPolicy.updatedAt.toISOString(),
    };

    return NextResponse.json(
      {
        policy: response,
        message: "Policy created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/cancellation-policies] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process cancellation policy" },
      { status: 500 }
    );
  }
}
