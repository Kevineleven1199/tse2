import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/accounting — Chart of Accounts + Balance Sheet + Trial Balance
 * POST /api/admin/accounting — Bootstrap default chart of accounts OR create journal entry
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session.role !== "HQ") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "chart"; // chart | balance-sheet | trial-balance | journal

  const tenantId = session.tenantId;

  if (view === "chart") {
    const accounts = await prisma.account.findMany({
      where: { tenantId, active: true },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });
    return NextResponse.json({ accounts });
  }

  if (view === "balance-sheet" || view === "trial-balance") {
    const accounts = await prisma.account.findMany({
      where: { tenantId, active: true },
      include: {
        entries: {
          select: { debit: true, credit: true },
        },
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    const balanceSheet = accounts.map((a) => {
      const totalDebit = a.entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = a.entries.reduce((s, e) => s + e.credit, 0);
      // Assets & Expenses: debit-normal. Liabilities, Equity, Revenue: credit-normal.
      const isDebitNormal = a.type === "asset" || a.type === "expense";
      const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        balance,
        totalDebit,
        totalCredit,
      };
    });

    const assets = balanceSheet.filter((a) => a.type === "asset");
    const liabilities = balanceSheet.filter((a) => a.type === "liability");
    const equity = balanceSheet.filter((a) => a.type === "equity");
    const revenue = balanceSheet.filter((a) => a.type === "revenue");
    const expenses = balanceSheet.filter((a) => a.type === "expense");

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0);
    const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    return NextResponse.json({
      accounts: balanceSheet,
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalRevenue,
        totalExpenses,
        netIncome,
        balanceCheck: Math.abs(totalAssets - (totalLiabilities + totalEquity + netIncome)) < 0.01,
      },
    });
  }

  if (view === "journal") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const entries = await prisma.journalEntry.findMany({
      where: {
        tenantId,
        ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      },
      include: { account: { select: { code: true, name: true, type: true } } },
      orderBy: { date: "desc" },
      take: 200,
    });
    return NextResponse.json({ entries });
  }

  return NextResponse.json({ error: "Invalid view" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session.role !== "HQ") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const tenantId = session.tenantId;

  // Bootstrap default chart of accounts
  if (body.action === "bootstrap") {
    const existing = await prisma.account.count({ where: { tenantId } });
    if (existing > 0) {
      return NextResponse.json({ ok: true, message: "Chart of accounts already exists", count: existing });
    }

    const defaults = [
      // Assets
      { code: "1000", name: "Cash & Bank", type: "asset", subtype: "current_asset", isSystem: true },
      { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "current_asset", isSystem: true },
      { code: "1200", name: "Stripe Balance", type: "asset", subtype: "current_asset", isSystem: true },
      { code: "1500", name: "Equipment", type: "asset", subtype: "fixed_asset" },
      { code: "1600", name: "Vehicles", type: "asset", subtype: "fixed_asset" },
      // Liabilities
      { code: "2000", name: "Accounts Payable", type: "liability", subtype: "current_liability", isSystem: true },
      { code: "2100", name: "Sales Tax Payable", type: "liability", subtype: "current_liability" },
      { code: "2200", name: "Contractor Payables", type: "liability", subtype: "current_liability", isSystem: true },
      // Equity
      { code: "3000", name: "Owner's Equity", type: "equity", isSystem: true },
      { code: "3100", name: "Retained Earnings", type: "equity", isSystem: true },
      // Revenue
      { code: "4000", name: "Cleaning Service Revenue", type: "revenue", isSystem: true },
      { code: "4100", name: "Add-On Service Revenue", type: "revenue" },
      { code: "4200", name: "Tips Received", type: "revenue" },
      { code: "4300", name: "Gift Card Revenue", type: "revenue" },
      // Expenses
      { code: "5000", name: "Labor — Contractor Pay", type: "expense", isSystem: true },
      { code: "5100", name: "Cleaning Supplies", type: "expense" },
      { code: "5200", name: "Fuel & Transportation", type: "expense" },
      { code: "5300", name: "Equipment & Tools", type: "expense" },
      { code: "5400", name: "Marketing & Advertising", type: "expense" },
      { code: "5500", name: "Software & Subscriptions", type: "expense" },
      { code: "5600", name: "Insurance", type: "expense" },
      { code: "5700", name: "Office & Administrative", type: "expense" },
      { code: "5800", name: "Stripe Fees", type: "expense" },
      { code: "5900", name: "Miscellaneous", type: "expense" },
    ];

    await prisma.account.createMany({
      data: defaults.map((a) => ({ ...a, tenantId })),
    });

    return NextResponse.json({ ok: true, message: "Chart of accounts created", count: defaults.length });
  }

  // Create journal entry
  if (body.action === "journal-entry") {
    const { accountId, date, description, debit, credit, reference, referenceId } = body;
    if (!accountId || !date || !description || (debit === 0 && credit === 0)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        tenantId,
        accountId,
        date: new Date(date),
        description,
        debit: debit || 0,
        credit: credit || 0,
        reference: reference || null,
        referenceId: referenceId || null,
        createdBy: session.userId,
      },
    });

    return NextResponse.json({ ok: true, entry });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
