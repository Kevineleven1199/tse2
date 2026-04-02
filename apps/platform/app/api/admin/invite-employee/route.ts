/**
 * POST /api/admin/invite-employee
 * Admin/Manager can invite a new cleaner or HQ manager
 * Body: { name, email, phone?, hourlyRate, role?, gustoEmployeeId? }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import { getSession } from "@/src/lib/auth/session";
import { applyPasswordHash } from "@/src/lib/auth/password";

export const dynamic = "force-dynamic";

interface InviteEmployeeRequest {
  name: string;
  email: string;
  phone?: string;
  hourlyRate: number;
  role?: "CLEANER" | "HQ" | "MANAGER";
  gustoEmployeeId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check — HQ only
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: InviteEmployeeRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, email",
        },
        { status: 400 }
      );
    }

    // Determine role and validate accordingly
    const role = body.role || "CLEANER";
    if (role === "CLEANER" && body.hourlyRate === undefined) {
      return NextResponse.json(
        {
          error: "Missing required field for cleaner: hourlyRate",
        },
        { status: 400 }
      );
    }

    // Parse name into first and last name
    const nameParts = body.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // Use the authenticated admin's tenant
    let tenantId = session.tenantId;
    if (!tenantId) {
      // Fallback: look up from the admin's user record
      const adminUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { tenantId: true },
      });
      tenantId = adminUser?.tenantId ?? "";
    }
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant configured" }, { status: 500 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Generate temporary password for the invite email
    const tempPassword = generateTempPassword();
    const hashedAvatar = await applyPasswordHash(tempPassword);

    // Create user with specified role (password hash stored in avatarUrl)
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: body.email,
        firstName,
        lastName,
        phone: body.phone || null,
        role,
        avatarUrl: hashedAvatar,
      },
    });

    // Create cleaner profile if role is CLEANER
    let cleanerData = null;
    if (role === "CLEANER") {
      cleanerData = await prisma.cleanerProfile.create({
        data: {
          userId: user.id,
          hourlyRate: body.hourlyRate || 0,
          active: true,
        },
      });
    }

    // Send invitation email (non-blocking — user is already created)
    let emailSent = false;
    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://web-production-cfe11.up.railway.app"}/login`;
      const emailHtml = generateInviteEmailHtml({
        name: body.name,
        email: body.email,
        tempPassword,
        loginUrl,
        role,
      });

      await sendEmailWithFailsafe({
        to: body.email,
        subject: `Welcome to Tri State Enterprise – Your Account Is Ready`,
        html: emailHtml,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("[invite-employee] Email send failed (user was still created):", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: emailSent
          ? "Invitation sent successfully"
          : `User created but email failed to send. Temp password: ${tempPassword}`,
        tempPassword: emailSent ? undefined : tempPassword,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        ...(cleanerData && {
          cleaner: {
            id: cleanerData.id,
            hourlyRate: cleanerData.hourlyRate,
            active: cleanerData.active,
          },
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[invite-employee] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generate a random temporary password
 */
function generateTempPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Generate invitation email HTML
 */
function generateInviteEmailHtml({
  name,
  email,
  tempPassword,
  loginUrl,
  role = "CLEANER",
}: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
  role?: "CLEANER" | "HQ" | "MANAGER";
}): string {
  const roleTitle = role === "HQ" ? "HQ Admin" : role === "MANAGER" ? "Manager" : "Cleaner";
  const roleDescription =
    role === "HQ"
      ? "as an HQ Admin with full platform access to manage team, automations, and integrations"
      : role === "MANAGER"
      ? "as a Manager with access to scheduling, customers, payroll, and team management for your territory"
      : "as a cleaner with access to the job marketplace and payouts dashboard";

  const nextSteps =
    role === "HQ"
      ? [
          "Login with your email and temporary password",
          "Change your password to something you'll remember",
          "Start managing team and operations",
        ]
      : [
          "Login with your email and temporary password",
          "Change your password to something you'll remember",
          "Set up your profile and availability",
          "Start claiming jobs and earning!",
        ];

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d5e3b; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Tri State Enterprise</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Welcome to the Team!</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
        <p style="color: #4b5563; line-height: 1.6;">
          Welcome to Tri State Enterprise! You've been invited to join our team ${roleDescription}. We're excited to have you on board!
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #16a34a; font-weight: 600; margin: 0 0 12px;">Your Account Details</p>
          <table style="width: 100%; font-size: 14px; color: #4b5563;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Email:</td>
              <td style="padding: 6px 0; text-align: right;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Role:</td>
              <td style="padding: 6px 0; text-align: right;">${roleTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Temporary Password:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace; background: white; padding: 8px; border-radius: 4px;">
                <code>${tempPassword}</code>
              </td>
            </tr>
          </table>
          <p style="margin: 12px 0 0; font-size: 12px; color: #9ca3af;">
            Please change your password immediately after logging in.
          </p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${loginUrl}"
             style="display: inline-block; background: #0d5e3b; color: white; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Login Now
          </a>
        </div>

        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; color: #4b5563;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #374151;">What happens next:</p>
          <ol style="padding-left: 20px; margin: 8px 0;">
            ${nextSteps.map(step => `<li style="margin-bottom: 6px;">${step}</li>`).join('')}
          </ol>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
          Questions? Reply to this email or contact us at (606) 555-0100<br/>
          100% organic. 100% satisfaction guaranteed.
        </p>
      </div>
    </div>
  `;
}
