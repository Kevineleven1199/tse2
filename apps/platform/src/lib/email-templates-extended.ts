/**
 * Extended Email Templates for TriState
 * Professional HTML email templates with inline CSS for maximum email client compatibility
 */

const BRAND_COLOR = "#22c55e";
const BRAND_COLOR_DARK = "#16a34a";
const TEXT_COLOR = "#1f2937";
const LIGHT_GRAY = "#f3f4f6";
const BORDER_COLOR = "#e5e7eb";

/**
 * Invoice Email Template
 * Displays invoice details with amount, due date, and payment link
 */
export function invoiceEmailTemplate({
  customerName,
  invoiceNumber,
  amount,
  dueDate,
  paymentUrl,
}: {
  customerName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  paymentUrl: string;
}): string {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${LIGHT_GRAY};">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%); padding: 32px; color: white; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Invoice</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Invoice #${invoiceNumber}</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 16px;">
        Hello <strong>${customerName}</strong>,
      </p>

      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 14px; line-height: 1.6;">
        Thank you for choosing Tri State Enterprise. Your invoice is ready for payment.
      </p>

      <!-- Invoice Details Box -->
      <div style="background-color: ${LIGHT_GRAY}; border: 1px solid ${BORDER_COLOR}; border-radius: 6px; padding: 20px; margin: 24px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid ${BORDER_COLOR};">
          <span style="color: ${TEXT_COLOR}; font-size: 14px;">Invoice Amount:</span>
          <span style="color: ${BRAND_COLOR}; font-size: 20px; font-weight: 700;">${formattedAmount}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: ${TEXT_COLOR}; font-size: 14px;">Due Date:</span>
          <span style="color: ${TEXT_COLOR}; font-size: 14px; font-weight: 500;">${dueDate}</span>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${paymentUrl}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Pay Now</a>
      </div>

      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
        If you have any questions about this invoice, please don't hesitate to contact us.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: ${LIGHT_GRAY}; padding: 20px; text-align: center; border-top: 1px solid ${BORDER_COLOR};">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        Tri State Enterprise<br>
        <a href="https://tse.com" style="color: ${BRAND_COLOR}; text-decoration: none;">Visit our website</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Payment Receipt Email Template
 * Confirms successful payment with receipt details
 */
export function paymentReceiptTemplate({
  customerName,
  amount,
  date,
  serviceName,
  paymentMethod,
}: {
  customerName: string;
  amount: number;
  date: string;
  serviceName: string;
  paymentMethod: string;
}): string {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${LIGHT_GRAY};">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
    <!-- Header with Success Icon -->
    <div style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%); padding: 32px; color: white; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Payment Received</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for your payment</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 16px;">
        Hello <strong>${customerName}</strong>,
      </p>

      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 14px; line-height: 1.6;">
        Your payment has been successfully processed. Here's your receipt:
      </p>

      <!-- Receipt Details -->
      <div style="background-color: ${LIGHT_GRAY}; border: 1px solid ${BORDER_COLOR}; border-radius: 6px; padding: 20px; margin: 24px 0;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Service</p>
          <p style="margin: 0; color: ${TEXT_COLOR}; font-size: 16px; font-weight: 500;">${serviceName}</p>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 16px 0; border-top: 1px solid ${BORDER_COLOR}; border-bottom: 1px solid ${BORDER_COLOR}; margin: 16px 0;">
          <span style="color: ${TEXT_COLOR}; font-size: 14px;">Amount Paid:</span>
          <span style="color: ${BRAND_COLOR}; font-size: 18px; font-weight: 700;">${formattedAmount}</span>
        </div>

        <div style="margin-top: 16px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Payment Method</p>
            <p style="margin: 0; color: ${TEXT_COLOR}; font-size: 14px;">${paymentMethod}</p>
          </div>
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Payment Date</p>
            <p style="margin: 0; color: ${TEXT_COLOR}; font-size: 14px;">${date}</p>
          </div>
        </div>
      </div>

      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
        Keep this receipt for your records. If you have any questions, please contact our support team.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: ${LIGHT_GRAY}; padding: 20px; text-align: center; border-top: 1px solid ${BORDER_COLOR};">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        Tri State Enterprise<br>
        <a href="https://tse.com" style="color: ${BRAND_COLOR}; text-decoration: none;">Visit our website</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Quote Notification Email Template
 * Notifies customer that a new quote is ready for review
 */
export function quoteNotificationTemplate({
  customerName,
  serviceName,
  price,
  quoteUrl,
}: {
  customerName: string;
  serviceName: string;
  price: number;
  quoteUrl: string;
}): string {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${LIGHT_GRAY};">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%); padding: 32px; color: white; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Your Quote is Ready</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Review and accept your customized quote</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 16px;">
        Hello <strong>${customerName}</strong>,
      </p>

      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 14px; line-height: 1.6;">
        We've prepared a personalized quote for your cleaning service. Review the details below and let us know if you're ready to move forward.
      </p>

      <!-- Quote Details -->
      <div style="background-color: ${LIGHT_GRAY}; border: 2px solid ${BRAND_COLOR}; border-radius: 6px; padding: 20px; margin: 24px 0;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Service</p>
          <p style="margin: 0; color: ${TEXT_COLOR}; font-size: 16px; font-weight: 500;">${serviceName}</p>
        </div>

        <div style="padding-top: 16px; border-top: 1px solid ${BORDER_COLOR};">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Estimated Cost</p>
          <p style="margin: 0; color: ${BRAND_COLOR}; font-size: 24px; font-weight: 700;">${formattedPrice}</p>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${quoteUrl}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Review Quote</a>
      </div>

      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
        This quote is valid for 30 days. Click the button above to review the full details or get in touch if you have any questions.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: ${LIGHT_GRAY}; padding: 20px; text-align: center; border-top: 1px solid ${BORDER_COLOR};">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        Tri State Enterprise<br>
        <a href="https://tse.com" style="color: ${BRAND_COLOR}; text-decoration: none;">Visit our website</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Review Request Email Template
 * Requests customer feedback via Google reviews
 */
export function reviewRequestEmailTemplate({
  customerName,
  cleanerName,
  reviewUrl,
}: {
  customerName: string;
  cleanerName: string;
  reviewUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${LIGHT_GRAY};">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%); padding: 32px; color: white; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 16px;">⭐</div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">How was your service?</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">We'd love to hear from you</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 16px;">
        Hello <strong>${customerName}</strong>,
      </p>

      <p style="margin: 0 0 16px 0; color: ${TEXT_COLOR}; font-size: 14px; line-height: 1.6;">
        Thank you for choosing Tri State Enterprise! We'd love to hear about your experience with <strong>${cleanerName}</strong>.
      </p>

      <p style="margin: 0 0 24px 0; color: ${TEXT_COLOR}; font-size: 14px; line-height: 1.6;">
        Your feedback helps us maintain the highest standards of service and helps other customers make informed decisions. Please take a moment to share your thoughts.
      </p>

      <!-- Review Stars -->
      <div style="text-align: center; margin: 32px 0; font-size: 36px;">
        ⭐ ⭐ ⭐ ⭐ ⭐
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${reviewUrl}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Leave a Review</a>
      </div>

      <!-- Alternative Text -->
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.6;">
        Or copy and paste this link in your browser:<br>
        <span style="color: ${BRAND_COLOR}; word-break: break-all; font-size: 11px;">${reviewUrl}</span>
      </p>

      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
        We're committed to providing exceptional cleaning services. If you experienced any issues, please reach out to us directly so we can make it right.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: ${LIGHT_GRAY}; padding: 20px; text-align: center; border-top: 1px solid ${BORDER_COLOR};">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        Tri State Enterprise<br>
        <a href="https://tse.com" style="color: ${BRAND_COLOR}; text-decoration: none;">Visit our website</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
