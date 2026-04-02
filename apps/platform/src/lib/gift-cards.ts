/**
 * Gift Card Management
 * Create, redeem, and track gift card usage
 */

import { prisma } from "@/lib/prisma";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";

export interface GiftCardPurchaseData {
  tenantId: string;
  initialBalance: number;
  purchaserEmail: string;
  purchaserName?: string;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  expiresAt?: Date;
}

export interface GiftCardRedeemData {
  code: string;
  amount: number;
  orderId?: string;
}

/**
 * Generate unique gift card code
 * Format: GGRN-XXXX-XXXX-XXXX
 */
export function generateGiftCardCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "GGRN";

  for (let i = 0; i < 3; i++) {
    let segment = "";
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += "-" + segment;
  }

  return code;
}

/**
 * Purchase a new gift card
 */
export async function purchaseGiftCard(data: GiftCardPurchaseData) {
  try {
    // Validate input
    if (!data.tenantId || typeof data.tenantId !== "string") {
      throw new Error("Invalid tenant ID");
    }

    if (typeof data.initialBalance !== "number" || data.initialBalance <= 0 || !isFinite(data.initialBalance)) {
      throw new Error("Gift card balance must be a positive number");
    }

    if (!data.purchaserEmail || typeof data.purchaserEmail !== "string") {
      throw new Error("Invalid purchaser email");
    }

    // Generate unique code
    let code = generateGiftCardCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.giftCard.findFirst({ where: { code } });
      if (!existing) break;
      code = generateGiftCardCode();
      attempts++;
    }

    if (attempts === 10) {
      throw new Error("Failed to generate unique gift card code");
    }

    // Create gift card
    const giftCard = await prisma.giftCard.create({
      data: {
        tenantId: data.tenantId,
        code,
        initialBalance: data.initialBalance,
        currentBalance: data.initialBalance,
        purchaserEmail: data.purchaserEmail,
        purchaserName: data.purchaserName,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        message: data.message,
        expiresAt: data.expiresAt,
        active: true
      }
    });

    // Send email to purchaser with code
    const purchaserHtml = `
      <h2>Gift Card Purchase Confirmation</h2>
      <p>Your Tri State gift card has been created!</p>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Code:</strong> ${code}</p>
        <p><strong>Amount:</strong> $${data.initialBalance.toFixed(2)}</p>
        ${data.recipientName ? `<p><strong>For:</strong> ${data.recipientName}</p>` : ""}
      </div>
      ${data.expiresAt ? `<p><em>Expires: ${new Date(data.expiresAt).toLocaleDateString()}</em></p>` : ""}
      <p>Share this code with the recipient to redeem.</p>
    `;

    await sendEmailWithFailsafe({
      to: data.purchaserEmail,
      subject: "Your Tri State Gift Card",
      html: purchaserHtml
    });

    // Send email to recipient if provided
    if (data.recipientEmail && typeof data.recipientEmail === "string") {
      const recipientHtml = `
        <h2>You've Received a Gift Card from Tri State!</h2>
        ${data.message ? `<p>${data.message}</p>` : ""}
        <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Gift Card Code:</strong> ${code}</p>
          <p><strong>Amount:</strong> $${data.initialBalance.toFixed(2)}</p>
        </div>
        <p>Use this code at checkout to apply the gift card to your order.</p>
        ${data.expiresAt ? `<p><em>Expires: ${new Date(data.expiresAt).toLocaleDateString()}</em></p>` : ""}
      `;

      await sendEmailWithFailsafe({
        to: data.recipientEmail,
        subject: "You've Received a Tri State Gift Card!",
        html: recipientHtml
      });
    }

    return giftCard;
  } catch (err) {
    console.error("Failed to purchase gift card:", err);
    throw err;
  }
}

/**
 * Get gift card by code
 */
export async function getGiftCardByCode(code: string) {
  try {
    const giftCard = await prisma.giftCard.findFirst({
      where: { code },
      include: { usages: true }
    });

    if (!giftCard) {
      return null;
    }

    // Check if expired
    if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
      return null;
    }

    // Check if active
    if (!giftCard.active) {
      return null;
    }

    return giftCard;
  } catch (err) {
    console.error(`Failed to get gift card ${code}:`, err);
    return null;
  }
}

/**
 * Redeem a gift card
 * Uses database transactions to prevent race conditions on balance deduction
 */
export async function redeemGiftCard(data: GiftCardRedeemData) {
  try {
    // Validate input
    if (!data.code || typeof data.code !== "string") {
      throw new Error("Invalid gift card code");
    }

    if (typeof data.amount !== "number" || data.amount <= 0 || !isFinite(data.amount)) {
      throw new Error("Invalid redemption amount");
    }

    // Use transaction to ensure atomic balance deduction
    const result = await prisma.$transaction(async (tx) => {
      const giftCard = await tx.giftCard.findFirst({
        where: { code: data.code }
      });

      if (!giftCard) {
        throw new Error("Invalid or expired gift card");
      }

      // Check if expired
      if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
        throw new Error("Gift card has expired");
      }

      // Check if active
      if (!giftCard.active) {
        throw new Error("Gift card is not active");
      }

      // Check balance with race condition prevention
      if (giftCard.currentBalance < data.amount) {
        throw new Error(`Insufficient balance. Available: $${giftCard.currentBalance.toFixed(2)}`);
      }

      // Deduct balance and create usage record in transaction
      const newBalance = giftCard.currentBalance - data.amount;

      const usage = await tx.giftCardUsage.create({
        data: {
          giftCardId: giftCard.id,
          amount: data.amount,
          orderId: data.orderId
        }
      });

      await tx.giftCard.update({
        where: { id: giftCard.id },
        data: { currentBalance: newBalance }
      });

      return {
        success: true,
        remainingBalance: newBalance,
        usageId: usage.id
      };
    });

    return result;
  } catch (err) {
    console.error(`Failed to redeem gift card ${data.code}:`, err);
    throw err;
  }
}

/**
 * Check gift card balance
 */
export async function checkGiftCardBalance(code: string) {
  try {
    const giftCard = await getGiftCardByCode(code);

    if (!giftCard) {
      return null;
    }

    return {
      code: giftCard.code,
      balance: giftCard.currentBalance,
      expiresAt: giftCard.expiresAt,
      isActive: giftCard.active && (!giftCard.expiresAt || giftCard.expiresAt > new Date())
    };
  } catch (err) {
    console.error(`Failed to check balance for ${code}:`, err);
    return null;
  }
}

/**
 * Get gift cards for tenant
 */
export async function getTenantGiftCards(tenantId: string) {
  return await prisma.giftCard.findMany({
    where: { tenantId },
    include: { usages: true },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Get gift card statistics
 */
export async function getGiftCardStats(tenantId: string) {
  const giftCards = await prisma.giftCard.findMany({
    where: { tenantId },
    include: { usages: true }
  });

  const now = new Date();
  const active = giftCards.filter(gc => gc.active && (!gc.expiresAt || gc.expiresAt > now));
  const expired = giftCards.filter(gc => gc.expiresAt && gc.expiresAt <= now);
  
  const totalIssued = giftCards.reduce((sum, gc) => sum + gc.initialBalance, 0);
  const totalUsed = giftCards.reduce((sum, gc) => sum + (gc.initialBalance - gc.currentBalance), 0);
  const totalAvailable = giftCards.reduce((sum, gc) => sum + gc.currentBalance, 0);

  return {
    totalIssued,
    totalUsed,
    totalAvailable,
    activeCards: active.length,
    expiredCards: expired.length,
    totalCards: giftCards.length
  };
}
