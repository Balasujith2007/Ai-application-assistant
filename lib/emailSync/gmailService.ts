import axios from "axios";
import { encryptToken, decryptToken } from "./crypto";
import prisma from "@/lib/prisma";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailRawMessage {
  id: string;
  threadId: string;
  senderName: string | null;
  senderEmail: string | null;
  subject: string;
  receivedDate: Date;
  snippet: string;
  bodyText: string;
}

/**
 * Generate Google OAuth 2.0 Authorization URL with Gmail readonly scope
 */
export function getGoogleOAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "DEMO_GOOGLE_CLIENT_ID";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange OAuth Authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // Return mock tokens for development/demo mode
    return {
      accessToken: "mock_access_token_" + Date.now(),
      refreshToken: "mock_refresh_token_" + Date.now(),
      expiresIn: 3600,
      email: "student@example.edu",
    };
  }

  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const { access_token, refresh_token, expires_in } = response.data;

  // Fetch user info email
  const userInfoResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresIn: expires_in,
    email: userInfoResponse.data.email,
  };
}

/**
 * Refresh expired access token using encrypted refresh token
 */
export async function getValidAccessToken(integrationId: string): Promise<string | null> {
  const integration = await prisma.studentEmailIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) return null;

  const accessToken = integration.encryptedAccessToken ? decryptToken(integration.encryptedAccessToken) : null;
  const refreshToken = integration.encryptedRefreshToken ? decryptToken(integration.encryptedRefreshToken) : null;
  const isExpired = integration.tokenExpiresAt ? new Date() >= integration.tokenExpiresAt : true;

  if (accessToken && !isExpired) {
    return accessToken;
  }

  if (!refreshToken) {
    return null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // If mock/demo tokens, return fresh mock token
    const newMockToken = "mock_refreshed_token_" + Date.now();
    await prisma.studentEmailIntegration.update({
      where: { id: integrationId },
      data: {
        encryptedAccessToken: encryptToken(newMockToken),
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
    return newMockToken;
  }

  try {
    const response = await axios.post(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    await prisma.studentEmailIntegration.update({
      where: { id: integrationId },
      data: {
        encryptedAccessToken: encryptToken(access_token),
        tokenExpiresAt: expiresAt,
        syncStatus: "CONNECTED",
      },
    });

    return access_token;
  } catch (err) {
    console.error("Failed to refresh Gmail token:", err);
    await prisma.studentEmailIntegration.update({
      where: { id: integrationId },
      data: { syncStatus: "ERROR" },
    });
    return null;
  }
}

/**
 * Fetch and decode recent career-related emails from Gmail API
 */
export async function fetchRecentCareerEmails(accessToken: string, maxResults = 25): Promise<GmailRawMessage[]> {
  if (accessToken.startsWith("mock_")) {
    // Return empty array for mock tokens if no real API
    return [];
  }

  try {
    // Query for application/career keywords
    const query = "subject:(application OR interview OR offer OR assessment OR shortlisted OR reject OR \"thank you for applying\")";
    const listRes = await axios.get(`${GMAIL_API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { q: query, maxResults },
    });

    const messages = listRes.data.messages || [];
    const results: GmailRawMessage[] = [];

    for (const msg of messages) {
      const detailRes = await axios.get(`${GMAIL_API_BASE}/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { format: "full" },
      });

      const data = detailRes.data;
      const headers = data.payload?.headers || [];
      
      const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date")?.value;

      let senderName = null;
      let senderEmail = fromHeader;
      const fromMatch = fromHeader.match(/^(?:['"]?([^'"]+)['"]?\s+)?<?([^<>@\s]+@[^<>@\s]+)>?$/);
      if (fromMatch) {
        senderName = fromMatch[1]?.trim() || null;
        senderEmail = fromMatch[2]?.trim() || fromHeader;
      }

      // Extract body snippet or text
      let bodyText = data.snippet || "";
      if (data.payload?.body?.data) {
        bodyText = Buffer.from(data.payload.body.data, "base64").toString("utf8");
      } else if (data.payload?.parts) {
        for (const part of data.payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyText = Buffer.from(part.body.data, "base64").toString("utf8");
            break;
          }
        }
      }

      results.push({
        id: data.id,
        threadId: data.threadId,
        senderName,
        senderEmail,
        subject: subjectHeader,
        receivedDate: dateHeader ? new Date(dateHeader) : new Date(Number(data.internalDate) || Date.now()),
        snippet: data.snippet || "",
        bodyText,
      });
    }

    return results;
  } catch (error) {
    console.error("Error fetching Gmail messages:", error);
    return [];
  }
}
