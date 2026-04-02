import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PayInvoiceClient } from "./PayInvoiceClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function PayInvoicePage({ params }: PageProps) {
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      customerEmail: true,
      lineItems: true,
      subtotal: true,
      taxRate: true,
      taxAmount: true,
      discountAmount: true,
      total: true,
      amountPaid: true,
      status: true,
      dueDate: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  if (invoice.status === "PAID") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-accent">Already Paid</h1>
          <p className="mt-2 text-muted-foreground">
            This invoice has already been paid. Thank you!
          </p>
        </div>
      </div>
    );
  }

  const amountDue = Math.round((invoice.total - (invoice.amountPaid ?? 0)) * 100) / 100;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-lg shadow-brand-100/40">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold text-accent">Pay Invoice</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tri State Enterprise</p>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl bg-brand-50/30 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium text-accent">#{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium text-accent">{invoice.customerName}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium text-accent">
                  {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
            <div className="border-t border-brand-100 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-accent">Amount Due</span>
                <span className="text-xl font-bold text-accent">${amountDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <PayInvoiceClient invoiceId={invoice.id} amount={amountDue} email={invoice.customerEmail} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Powered by Stripe. Your payment information is secure and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
