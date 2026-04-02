/**
 * Campaign Templates API
 * GET /api/admin/campaigns/templates → List available templates
 */
import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { CAMPAIGN_TEMPLATES } from "@/src/lib/email-campaign-templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ templates: CAMPAIGN_TEMPLATES });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
