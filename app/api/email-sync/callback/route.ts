import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/emailSync/gmailService";
import { encryptToken } from "@/lib/emailSync/crypto";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000";
    const redirectTarget = new URL("/applications?sync=connected", origin).toString();

    if (error || !code || !state) {
      const errorUrl = new URL(`/applications?sync=error&error=${encodeURIComponent(error || "missing_code")}`, origin).toString();
      return NextResponse.redirect(errorUrl);
    }

    let userId: string | null = null;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
      userId = decoded.userId;
    } catch {
      return NextResponse.redirect(new URL("/applications?sync=error&error=invalid_state", origin).toString());
    }

    if (!userId) {
      return NextResponse.redirect(new URL("/applications?sync=error&error=no_user", origin).toString());
    }

    const redirectUri = new URL("/api/email-sync/callback", origin).toString();
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    const expiresAt = new Date(Date.now() + (tokenResult.expiresIn || 3600) * 1000);

    await prisma.studentEmailIntegration.upsert({
      where: { userId },
      update: {
        provider: "GMAIL",
        emailAddress: tokenResult.email || "student@gmail.com",
        encryptedAccessToken: encryptToken(tokenResult.accessToken),
        encryptedRefreshToken: tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : undefined,
        tokenExpiresAt: expiresAt,
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
      },
      create: {
        userId,
        provider: "GMAIL",
        emailAddress: tokenResult.email || "student@gmail.com",
        encryptedAccessToken: encryptToken(tokenResult.accessToken),
        encryptedRefreshToken: tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : undefined,
        tokenExpiresAt: expiresAt,
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.redirect(redirectTarget);
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000";
    return NextResponse.redirect(new URL("/applications?sync=error&error=callback_failed", origin).toString());
  }
}
