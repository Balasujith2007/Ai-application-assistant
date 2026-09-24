import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/serverAuth";
import { getValidAccessToken, fetchRecentCareerEmails } from "@/lib/emailSync/gmailService";
import { processStudentEmails, IngestableEmail } from "@/lib/emailSync/emailIngestionEngine";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const integration = await prisma.studentEmailIntegration.findUnique({
      where: { userId },
    });

    if (!integration || integration.syncStatus === "DISCONNECTED") {
      return NextResponse.json({ message: "Email integration is not connected." }, { status: 400 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is normal for standard sync
    }

    // Set status to SYNCING
    await prisma.studentEmailIntegration.update({
      where: { userId },
      data: { syncStatus: "SYNCING" },
    });

    let emailsToProcess: IngestableEmail[] = [];

    // Check if simulation payload was supplied (for testing / demo)
    if (body.mockEmails && Array.isArray(body.mockEmails)) {
      emailsToProcess = body.mockEmails.map((e: any, idx: number) => ({
        messageId: e.messageId || `msg_sim_${Date.now()}_${idx}`,
        senderEmail: e.senderEmail || "careers@google.com",
        senderName: e.senderName || "Google Careers",
        subject: e.subject || "Status Update regarding your application",
        bodyText: e.bodyText || "We would like to invite you to interview.",
        receivedDate: e.receivedDate ? new Date(e.receivedDate) : new Date(),
      }));
    } else {
      // Try to fetch real emails from Gmail API if connected with real OAuth token
      const accessToken = await getValidAccessToken(integration.id);
      if (accessToken && !accessToken.startsWith("mock_")) {
        const rawGmailMsgs = await fetchRecentCareerEmails(accessToken);
        emailsToProcess = rawGmailMsgs.map((m) => ({
          messageId: m.id,
          senderEmail: m.senderEmail || "unknown@company.com",
          senderName: m.senderName,
          subject: m.subject,
          bodyText: m.bodyText || m.snippet,
          receivedDate: m.receivedDate,
        }));
      }
    }

    const report = await processStudentEmails(userId, emailsToProcess);

    // Update integration last synced time
    await prisma.studentEmailIntegration.update({
      where: { userId },
      data: {
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${report.autoMatched} updated, ${report.sentToReview} queued for review, ${report.skipped} skipped.`,
      report,
    });
  } catch (error: any) {
    console.error("Email sync error:", error);
    return NextResponse.json({ message: error.message || "Email synchronization failed" }, { status: 500 });
  }
}
