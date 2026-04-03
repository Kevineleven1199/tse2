import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return new Response(unsubscribeHTML("Missing email parameter."), {
        headers: { "Content-Type": "text/html" },
        status: 400,
      });
    }

    const decoded = decodeURIComponent(email).toLowerCase();

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: decoded },
    });

    if (!subscriber || subscriber.status !== "active") {
      return new Response(
        unsubscribeHTML("This email is not currently subscribed."),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    await prisma.newsletterSubscriber.update({
      where: { email: decoded },
      data: {
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      },
    });

    return new Response(
      unsubscribeHTML(
        "You've been unsubscribed from the Tri State newsletter. We're sorry to see you go!"
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("[newsletter-unsubscribe] Error:", error);
    return new Response(
      unsubscribeHTML("Something went wrong. Please try again or email tse@tristateenterprise.com."),
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
};

const unsubscribeHTML = (message: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unsubscribe</title></head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,system-ui,sans-serif;background:#f3f4f6;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <h1 style="font-size:24px;color:#1e5130;margin:0 0 16px;">Tri State Enterprise</h1>
    <p style="font-size:16px;color:#374151;line-height:1.6;">${message}</p>
    <a href="https://tseorganicclean264-production.up.railway.app/"
       style="display:inline-block;margin-top:24px;background:#0fb77a;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;">
      Visit Our Website
    </a>
  </div>
</body>
</html>`;
