import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async () => {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
};
