/**
 * Gusto Payroll Integration
 * Handles communication with Gusto API for employee payroll data
 */

import { prisma } from "@/lib/prisma";

const GUSTO_BASE_URL = "https://api.gusto.com/v1";

interface GustoPayStub {
  id: string;
  employee_id: string;
  check_number?: number;
  gross_pay: number;
  net_pay: number;
  pay_period_start: string;
  pay_period_end: string;
  payment_method?: string;
  processed_date?: string;
  deductions?: Array<{
    name: string;
    amount: number;
  }>;
}

interface GustoEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  employment_status: string;
}

interface GustoPayroll {
  id: string;
  payroll_deadline: string;
  pay_period_start: string;
  pay_period_end: string;
  processed_date?: string;
}

/**
 * Helper function to make authenticated Gusto API requests
 */
async function gustoRequest<T>(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<T | null> {
  const token = process.env.GUSTO_API_TOKEN;

  if (!token) {
    console.error("[gusto] GUSTO_API_TOKEN not configured");
    return null;
  }

  const url = `${GUSTO_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      console.error(
        `[gusto] API error: ${response.status} ${response.statusText} - ${endpoint}`
      );
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`[gusto] Request failed for ${endpoint}:`, error);
    return null;
  }
}

/**
 * Fetch all employees for a company
 */
export async function getEmployees(
  companyId: string
): Promise<GustoEmployee[] | null> {
  return gustoRequest<GustoEmployee[]>(
    `/companies/${companyId}/employees`
  );
}

/**
 * Fetch a specific employee by ID
 */
export async function getEmployee(
  employeeId: string
): Promise<GustoEmployee | null> {
  return gustoRequest<GustoEmployee>(`/employees/${employeeId}`);
}

/**
 * Fetch pay stubs for an employee with optional date filtering
 */
export async function getPayStubs(
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<GustoPayStub[] | null> {
  let endpoint = `/employees/${employeeId}/pay_stubs`;

  // Add date filters if provided
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  return gustoRequest<GustoPayStub[]>(endpoint);
}

/**
 * Fetch W-2/tax documents for an employee
 */
export async function getW2s(
  employeeId: string,
  year?: number
): Promise<any[] | null> {
  let endpoint = `/employees/${employeeId}/federal_tax_documents`;

  if (year) {
    endpoint += `?year=${year}`;
  }

  return gustoRequest<any[]>(endpoint);
}

/**
 * Fetch payrolls for a company with optional date filtering
 */
export async function getPayrolls(
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<GustoPayroll[] | null> {
  let endpoint = `/companies/${companyId}/payrolls`;

  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  return gustoRequest<GustoPayroll[]>(endpoint);
}

/**
 * Sync Gusto employee pay history to database
 * Creates Timesheet and PayrollAdjustment records from Gusto pay stubs
 */
export async function syncGustoEmployeePayHistory(
  gustoEmployeeId: string,
  cleanerId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify cleaner exists
    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { id: cleanerId },
    });

    if (!cleaner) {
      return { success: false, message: "Cleaner profile not found" };
    }

    // Fetch pay stubs from Gusto for 2025
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const payStubs = await getPayStubs(gustoEmployeeId, startDate, endDate);

    if (!payStubs || payStubs.length === 0) {
      return { success: false, message: "No pay stubs found for this year" };
    }

    let createdTimesheets = 0;
    let createdAdjustments = 0;

    // Process each pay stub
    for (const stub of payStubs) {
      // Calculate hours worked from gross pay and hourly rate
      const hoursWorked = cleaner.hourlyRate > 0
        ? stub.gross_pay / cleaner.hourlyRate
        : 0;

      // Create or update timesheet entry
      const payPeriodStart = new Date(stub.pay_period_start);
      const payPeriodEnd = new Date(stub.pay_period_end);

      // Create a timesheet entry for the pay period
      const existingTimesheet = await prisma.timesheet.findFirst({
        where: {
          cleanerId,
          clockIn: {
            gte: payPeriodStart,
            lte: payPeriodEnd,
          },
        },
      });

      if (!existingTimesheet) {
        await prisma.timesheet.create({
          data: {
            cleanerId,
            date: payPeriodStart,
            clockIn: payPeriodStart,
            clockOut: payPeriodEnd,
            hoursWorked,
            source: "gusto",
            approved: true,
          },
        });
        createdTimesheets++;
      }

      // Create deduction adjustments if any
      if (stub.deductions && stub.deductions.length > 0) {
        for (const deduction of stub.deductions) {
          const existingAdj = await prisma.payrollAdjustment.findFirst({
            where: {
              cleanerId,
              description: deduction.name,
              payPeriodStart,
              payPeriodEnd,
            },
          });

          if (!existingAdj) {
            await prisma.payrollAdjustment.create({
              data: {
                cleanerId,
                type: "deduction",
                amount: deduction.amount,
                description: deduction.name,
                payPeriodStart,
                payPeriodEnd,
                createdBy: "gusto-sync",
              },
            });
            createdAdjustments++;
          }
        }
      }
    }

    return {
      success: true,
      message: `Synced ${createdTimesheets} timesheets and ${createdAdjustments} adjustments from Gusto`,
    };
  } catch (error) {
    console.error("[gusto] Sync failed:", error);
    return {
      success: false,
      message: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
