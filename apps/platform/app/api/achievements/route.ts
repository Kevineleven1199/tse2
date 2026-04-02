import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";
import { getUserAchievementSummary } from "@/src/lib/achievements";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const summary = await getUserAchievementSummary(session.userId, session.role);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[achievements API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 });
  }
}
