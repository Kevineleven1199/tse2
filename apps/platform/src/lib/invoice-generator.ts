import { prisma } from "@/lib/prisma";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import type { Invoice } from "@prisma/client";

/**
 * Generate a unique invoice number in format: INV-YYYYMMDD-XXXX
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `INV-${year}${month}${day}-${random}`;
}

/**
 * Create an invoice from a job
 */
export async function createInvoiceFromJob(jobId: string, tenantId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: true,
      assignments: { include: { cleaner: true } },
      payouts: true,
    },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (!job.request) {
    throw new Error(`Service request not found for job: ${jobId}`);
  }

  const req = job.request;

  // Validate and normalize payout amount
  let payoutAmount = 0;
  if (typeof job.payoutAmount === "number" && isFinite(job.payoutAmount) && job.payoutAmount > 0) {
    payoutAmount = job.payoutAmount;
  } else if (job.payoutAmount !== null && job.payoutAmount !== undefined) {
    console.warn(`Invalid payoutAmount for job ${jobId}: ${job.payoutAmount}`);
  }

  // Build line items from job details
  const lineItems = [
    {
      description: `${(req.serviceType || "Service").replace(/_/g, " ")} - ${req.addressLine1 || ""}, ${req.city || ""}, ${req.state || ""}`,
      quantity: 1,
      unitPrice: payoutAmount,
      total: payoutAmount,
    },
  ];

  const subtotal = payoutAmount;
  const taxAmount = 0;
  const discountAmount = 0;
  const total = subtotal + taxAmount - discountAmount;

  // Safely format scheduled date
  let scheduledDateStr = "TBD";
  if (job.scheduledStart && job.scheduledStart instanceof Date && !isNaN(job.scheduledStart.getTime())) {
    scheduledDateStr = job.scheduledStart.toLocaleDateString();
  }

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      invoiceNumber: generateInvoiceNumber(),
      customerName: req.customerName || "Customer",
      customerEmail: req.customerEmail || "",
      customerPhone: req.customerPhone,
      serviceRequestId: req.id,
      jobId: jobId,
      lineItems: lineItems as any,
      subtotal,
      taxRate: 0,
      taxAmount,
      discountAmount,
      total,
      amountPaid: 0,
      status: "DRAFT",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: `Invoice for job scheduled on ${scheduledDateStr}`,
    },
  });

  return invoice;
}

/**
 * Send invoice email to customer
 */
export async function sendInvoiceEmail(invoice: Invoice): Promise<void> {
  try {
    // Validate invoice and inputs
    if (!invoice || !invoice.customerEmail) {
      throw new Error("Invalid invoice or missing customer email");
    }

    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

    const lineItemsHtml = lineItems.map((item: any) => {
      const quantity = typeof item.quantity === "number" ? item.quantity : 0;
      const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : 0;
      const total = typeof item.total === "number" ? item.total : 0;

      return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: left;">${item.description || ""}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${quantity}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${unitPrice.toFixed(2)}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${total.toFixed(2)}</td>
    </tr>
  `;
    }).join("");

    // Safely format due date
    let dueDate = "Upon completion";
    if (invoice.dueDate && invoice.dueDate instanceof Date && !isNaN(invoice.dueDate.getTime())) {
      dueDate = invoice.dueDate.toLocaleDateString();
    } else if (invoice.dueDate instanceof Date) {
      console.warn(`Invalid dueDate for invoice ${invoice.id}`);
    }

    // Safely access and format numeric values
    const subtotal = typeof invoice.subtotal === "number" ? invoice.subtotal : 0;
    const taxAmount = typeof invoice.taxAmount === "number" ? invoice.taxAmount : 0;
    const taxRate = typeof invoice.taxRate === "number" ? invoice.taxRate : 0;
    const discountAmount = typeof invoice.discountAmount === "number" ? invoice.discountAmount : 0;
    const total = typeof invoice.total === "number" ? invoice.total : 0;

    // Safely format invoice date
    let invoiceDate = "Unknown";
    if (invoice.createdAt && invoice.createdAt instanceof Date && !isNaN(invoice.createdAt.getTime())) {
      invoiceDate = invoice.createdAt.toLocaleDateString();
    } else if (invoice.createdAt) {
      // Handle string dates
      const dateObj = new Date(invoice.createdAt);
      if (!isNaN(dateObj.getTime())) {
        invoiceDate = dateObj.toLocaleDateString();
      }
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width">
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(to right, #0fb77a, #0d5e3b);padding:32px;color:#ffffff;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                  <div>
                    <h1 style="margin:0;font-size:28px;font-weight:700;">INVOICE</h1>
                    <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">${invoice.invoiceNumber || "N/A"}</p>
                  </div>
                  <div style="text-align:right;">
                    <p style="margin:0;font-size:14px;">Invoice Date</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;">${invoiceDate}</p>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Customer Info -->
            <tr><td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#0fb77a;font-size:16px;font-weight:600;">Bill To</h2>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1f2937;">${invoice.customerName || "Customer"}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${invoice.customerEmail || ""}</p>
              ${invoice.customerPhone ? `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${invoice.customerPhone}</p>` : ""}
            </td></tr>

            <!-- Line Items -->
            <tr><td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <thead>
                  <tr style="border-bottom:2px solid #0fb77a;">
                    <th style="padding:12px 0;text-align:left;font-weight:600;color:#1f2937;font-size:14px;">Description</th>
                    <th style="padding:12px 0;text-align:right;font-weight:600;color:#1f2937;font-size:14px;">Qty</th>
                    <th style="padding:12px 0;text-align:right;font-weight:600;color:#1f2937;font-size:14px;">Unit Price</th>
                    <th style="padding:12px 0;text-align:right;font-weight:600;color:#1f2937;font-size:14px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHtml}
                </tbody>
              </table>
            </td></tr>

            <!-- Totals -->
            <tr><td style="padding:0 32px 32px;">
              <div style="background:#f0fdf4;border-radius:8px;padding:20px;border:1px solid #dcfce7;">
                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                  <span style="color:#6b7280;font-size:14px;">Subtotal</span>
                  <span style="color:#1f2937;font-weight:600;font-size:14px;">$${subtotal.toFixed(2)}</span>
                </div>
                ${taxAmount > 0 ? `
                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                  <span style="color:#6b7280;font-size:14px;">Tax (${(taxRate * 100).toFixed(0)}%)</span>
                  <span style="color:#1f2937;font-weight:600;font-size:14px;">$${taxAmount.toFixed(2)}</span>
                </div>
                ` : ""}
                ${discountAmount > 0 ? `
                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                  <span style="color:#6b7280;font-size:14px;">Discount</span>
                  <span style="color:#dc2626;font-weight:600;font-size:14px;">-$${discountAmount.toFixed(2)}</span>
                </div>
                ` : ""}
                <div style="display:flex;justify-content:space-between;border-top:1px solid #dcfce7;padding-top:12px;">
                  <span style="color:#1f2937;font-weight:700;font-size:16px;">Total Due</span>
                  <span style="color:#0fb77a;font-weight:700;font-size:18px;">$${total.toFixed(2)}</span>
                </div>
              </div>
            </td></tr>

            <!-- Due Date & CTA -->
            <tr><td style="padding:0 32px 32px;border-top:1px solid #e5e7eb;">
              <div style="margin-top:24px;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:14px;"><strong>Due Date:</strong> ${dueDate}</p>
                ${invoice.notes ? `<p style="margin:8px 0 0;color:#6b7280;font-size:14px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
              </div>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.tsenow.com"}/invoice/${invoice.id}"
                 style="display:inline-block;background:linear-gradient(to right, #0fb77a, #0d5e3b);color:#ffffff;padding:12px 32px;border-radius:999px;text-decoration:none;font-weight:600;margin-top:24px;font-size:14px;">
                View Invoice Online
              </a>
            </td></tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f0fdf4;padding:24px;text-align:center;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 8px;">Tri State Enterprise</p>
                <p style="margin:0;">(606) 555-0100 | info@tsenow.com</p>
                <p style="margin:8px 0 0;font-size:12px;">Flatwoods's #1 Eco-Friendly Cleaning Service</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

    await sendEmailWithFailsafe({
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.invoiceNumber} from Tri State Enterprise`,
      html,
    });
  } catch (err) {
    console.error(`Failed to send invoice email for invoice ${invoice.id}:`, err);
    throw err;
  }
}

/**
 * Send payment reminder email for overdue invoices
 */
export async function sendPaymentReminder(invoice: Invoice): Promise<void> {
  try {
    if (!invoice || !invoice.customerEmail) {
      throw new Error("Invalid invoice or missing customer email");
    }

    // Safely calculate days overdue
    let daysOverdue = 0;
    if (invoice.dueDate && invoice.dueDate instanceof Date && !isNaN(invoice.dueDate.getTime())) {
      daysOverdue = Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    } else if (invoice.dueDate) {
      const dateObj = new Date(invoice.dueDate);
      if (!isNaN(dateObj.getTime())) {
        daysOverdue = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Safely format total amount
    const total = typeof invoice.total === "number" ? invoice.total : 0;

    // Safely format due date
    let dueDateStr = "Upon completion";
    if (invoice.dueDate && invoice.dueDate instanceof Date && !isNaN(invoice.dueDate.getTime())) {
      dueDateStr = invoice.dueDate.toLocaleDateString();
    } else if (invoice.dueDate) {
      const dateObj = new Date(invoice.dueDate);
      if (!isNaN(dateObj.getTime())) {
        dueDateStr = dateObj.toLocaleDateString();
      }
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width">
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(to right, #dc2626, #991b1b);padding:32px;color:#ffffff;text-align:center;">
                <h1 style="margin:0;font-size:24px;font-weight:700;">Payment Reminder</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Invoice ${invoice.invoiceNumber || "N/A"}</p>
              </td>
            </tr>

            <!-- Content -->
            <tr><td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1f2937;font-size:15px;">
                Hi ${invoice.customerName || "Customer"},
              </p>
              <p style="margin:0 0 16px;color:#1f2937;font-size:15px;">
                This is a friendly reminder that payment of <strong style="color:#dc2626;">$${total.toFixed(2)}</strong>
                is now due on invoice <strong>${invoice.invoiceNumber || "N/A"}</strong>.
              </p>
              ${daysOverdue > 0 ? `
              <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:4px;">
                <p style="margin:0;color:#991b1b;font-weight:600;font-size:14px;">
                  This invoice is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue
                </p>
              </div>
              ` : ""}
              <p style="margin:0 0 16px;color:#1f2937;font-size:15px;">
                Due Date: <strong>${dueDateStr}</strong>
              </p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
                Please make payment at your earliest convenience. If you have already sent payment, please disregard this notice.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.tsenow.com"}/invoice/${invoice.id}"
                 style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">
                Pay Now
              </a>
            </td></tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;padding:24px;text-align:center;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 8px;">Tri State Enterprise</p>
                <p style="margin:0;">(606) 555-0100 | info@tsenow.com</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

    await sendEmailWithFailsafe({
      to: invoice.customerEmail,
      subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
      html,
    });
  } catch (err) {
    console.error(`Failed to send payment reminder for invoice ${invoice.id}:`, err);
    throw err;
  }
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceAsSent(invoiceId: string): Promise<Invoice> {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

/**
 * Mark invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: string, amountPaid?: number): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Validate and normalize amount paid
  let newAmountPaid = 0;
  if (amountPaid !== undefined) {
    if (typeof amountPaid !== "number" || !isFinite(amountPaid) || amountPaid < 0) {
      throw new Error("Invalid amountPaid: must be a non-negative number");
    }
    newAmountPaid = amountPaid;
  } else {
    newAmountPaid = typeof invoice.total === "number" ? invoice.total : 0;
  }

  const invoiceTotal = typeof invoice.total === "number" ? invoice.total : 0;
  const isPaid = newAmountPaid >= invoiceTotal;

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: newAmountPaid,
      status: isPaid ? "PAID" : "SENT",
      paidAt: isPaid ? new Date() : null,
    },
  });
}
