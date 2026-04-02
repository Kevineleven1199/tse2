import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/export/quickbooks?type=invoices|expenses|payroll&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Generates QuickBooks-compatible CSV for import into QB Desktop or Online
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "invoices";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };

  let csv = "";
  let filename = "";

  try {
    if (type === "invoices") {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: session.tenantId, createdAt: dateFilter },
        orderBy: { createdAt: "asc" },
      });

      // QuickBooks Invoice Import format
      csv = "InvoiceNo,Customer,InvoiceDate,DueDate,ItemDescription,ItemQty,ItemRate,ItemAmount,TaxAmount,TotalAmount,Status\n";
      for (const inv of invoices) {
        const items = Array.isArray(inv.lineItems) ? inv.lineItems : [];
        if (items.length === 0) {
          csv += `"${inv.invoiceNumber}","${inv.customerName}","${fmtDate(inv.createdAt)}","${inv.dueDate ? fmtDate(inv.dueDate) : ""}","Cleaning Service",1,${inv.total},${inv.total},${inv.taxAmount ?? 0},${inv.total},"${inv.status}"\n`;
        } else {
          for (const item of items as any[]) {
            const qty = item.quantity ?? 1;
            const rate = item.unitPrice ?? item.amount ?? 0;
            csv += `"${inv.invoiceNumber}","${inv.customerName}","${fmtDate(inv.createdAt)}","${inv.dueDate ? fmtDate(inv.dueDate) : ""}","${(item.description || "Service").replace(/"/g, '""')}",${qty},${rate},${qty * rate},${inv.taxAmount ?? 0},${inv.total},"${inv.status}"\n`;
          }
        }
      }
      filename = `tse-invoices-${fmtDate(new Date())}.csv`;

    } else if (type === "expenses") {
      const expenses = await prisma.expense.findMany({
        where: { tenantId: session.tenantId, date: dateFilter },
        orderBy: { date: "asc" },
      });

      csv = "Date,Vendor,Category,Description,Amount,PaymentMethod\n";
      for (const exp of expenses) {
        csv += `"${fmtDate(exp.date)}","${(exp.vendor ?? "").replace(/"/g, '""')}","${exp.category}","${(exp.description ?? "").replace(/"/g, '""')}",${exp.amount},""\n`;
      }
      filename = `tse-expenses-${fmtDate(new Date())}.csv`;

    } else if (type === "payroll") {
      const paystubs = await prisma.paystub.findMany({
        where: { status: "finalized", periodEnd: dateFilter },
        include: { cleaner: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
        orderBy: { periodEnd: "asc" },
      });

      csv = "PayPeriod,Name,Email,TaxClass,HoursWorked,HourlyRate,GrossPay,Deductions,Reimbursements,Bonuses,NetPay\n";
      for (const ps of paystubs) {
        const name = `${ps.cleaner.user.firstName} ${ps.cleaner.user.lastName}`.trim();
        csv += `"${ps.periodLabel}","${name}","${ps.cleaner.user.email}","${ps.taxClassification ?? "1099"}",${ps.totalHours},${ps.hourlyRate},${ps.grossPay},${ps.deductions},${ps.reimbursements},${ps.bonuses},${ps.netPay}\n`;
      }
      filename = `tse-payroll-${fmtDate(new Date())}.csv`;

    } else {
      return NextResponse.json({ error: "Invalid type. Use: invoices, expenses, payroll" }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[QB export]", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function fmtDate(d: Date): string {
  return new Date(d).toISOString().split("T")[0];
}
