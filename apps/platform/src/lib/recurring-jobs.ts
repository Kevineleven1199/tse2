import { prisma } from "@/lib/prisma";
import { RecurringFrequency } from "@prisma/client";

export type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";

export async function createRecurringSchedule(data: {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  serviceType: string;
  frequency: Frequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  startDate: Date;
  basePrice: number;
  notes?: string;
}) {
  // Validate input
  if (!data.tenantId || typeof data.tenantId !== "string") {
    throw new Error("Invalid tenantId");
  }

  if (!data.customerName || typeof data.customerName !== "string") {
    throw new Error("Invalid customerName");
  }

  if (!data.customerEmail || typeof data.customerEmail !== "string") {
    throw new Error("Invalid customerEmail");
  }

  if (!data.address || typeof data.address !== "string") {
    throw new Error("Invalid address");
  }

  if (!data.serviceType || typeof data.serviceType !== "string") {
    throw new Error("Invalid serviceType");
  }

  if (typeof data.basePrice !== "number" || data.basePrice <= 0 || !isFinite(data.basePrice)) {
    throw new Error("basePrice must be a positive number");
  }

  const nextRunDate = calculateNextJobDate(data.frequency, data.startDate);

  return prisma.recurringSchedule.create({
    data: {
      tenantId: data.tenantId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      address: data.address,
      serviceType: data.serviceType,
      frequency: data.frequency as RecurringFrequency,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      startDate: data.startDate,
      nextRunDate,
      basePrice: data.basePrice,
      notes: data.notes,
      active: true,
    },
  });
}

export function calculateNextJobDate(
  frequency: Frequency,
  fromDate: Date
): Date {
  // Validate input date
  if (!fromDate || !(fromDate instanceof Date) || isNaN(fromDate.getTime())) {
    throw new Error("Invalid fromDate provided");
  }

  const next = new Date(fromDate);

  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      // Handle month boundary edge case (e.g., Jan 31 + 1 month)
      const originalDate = next.getDate();
      next.setMonth(next.getMonth() + 1);
      // If day is invalid for the new month, set to last day of month
      if (next.getDate() !== originalDate) {
        next.setDate(0); // Set to last day of previous month (current month)
      }
      break;
    case "QUARTERLY":
      // Handle quarter boundary edge case
      const originalDateQ = next.getDate();
      next.setMonth(next.getMonth() + 3);
      if (next.getDate() !== originalDateQ) {
        next.setDate(0); // Set to last day of previous month
      }
      break;
  }

  // Ensure result is valid
  if (isNaN(next.getTime())) {
    throw new Error("Failed to calculate valid next job date");
  }

  return next;
}

export async function pauseSchedule(id: string) {
  return prisma.recurringSchedule.update({
    where: { id },
    data: { pausedAt: new Date() },
  });
}

export async function resumeSchedule(id: string) {
  return prisma.recurringSchedule.update({
    where: { id },
    data: { pausedAt: null },
  });
}
