import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/serverAuth";
import { getGoogleOAuthUrl } from "@/lib/emailSync/gmailService";
import { encryptToken } from "@/lib/emailSync/crypto";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mockConnect = searchParams.get("mock") === "true";

    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000";
    const redirectUri = new URL("/api/email-sync/callback", origin).toString();

    // If student clicks instant mock connect for local / testing mode
    if (mockConnect) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const email = user?.email || "student@example.edu";

      const integration = await prisma.studentEmailIntegration.upsert({
        where: { userId },
        update: {
          emailAddress: email,
          encryptedAccessToken: encryptToken("mock_token_" + Date.now()),
          encryptedRefreshToken: encryptToken("mock_refresh_" + Date.now()),
          tokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          syncStatus: "CONNECTED",
          lastSyncedAt: new Date(),
        },
        create: {
          userId,
          provider: "GMAIL",
          emailAddress: email,
          encryptedAccessToken: encryptToken("mock_token_" + Date.now()),
          encryptedRefreshToken: encryptToken("mock_refresh_" + Date.now()),
          tokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          syncStatus: "CONNECTED",
          lastSyncedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Email integration connected successfully (Mock / Sandbox mode).",
        integration: {
          id: integration.id,
          emailAddress: integration.emailAddress,
          syncStatus: integration.syncStatus,
          lastSyncedAt: integration.lastSyncedAt,
        },
      });
    }

    const statePayload = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64");
    const authUrl = getGoogleOAuthUrl(statePayload, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
    });
  } catch (error: any) {
    console.error("Email sync auth error:", error);
    return NextResponse.json({ message: error.message || "Failed to initiate email authentication" }, { status: 500 });
  }
}
