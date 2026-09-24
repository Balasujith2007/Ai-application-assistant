import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let integration: any = null;
    let pendingReviewsCount = 0;
    let emailVerifiedAppsCount = 0;
    let recentEvidences: any[] = [];

    try {
      integration = await prisma.studentEmailIntegration.findUnique({
        where: { userId },
        select: {
          id: true,
          provider: true,
          emailAddress: true,
          syncStatus: true,
          lastSyncedAt: true,
          autoSyncEnabled: true,
          createdAt: true,
        },
      });

      pendingReviewsCount = await prisma.emailStatusReview.count({
        where: {
          studentId: userId,
          status: "PENDING",
        },
      });

      emailVerifiedAppsCount = await prisma.application.count({
        where: {
          userId,
          statusSource: "COMPANY_EMAIL",
        },
      });

      recentEvidences = await prisma.emailEvidence.findMany({
        where: { studentId: userId },
        orderBy: { receivedDate: "desc" },
        take: 10,
        select: {
          id: true,
          applicationId: true,
          companyName: true,
          detectedStatus: true,
          confidence: true,
          receivedDate: true,
          subject: true,
          senderEmail: true,
          cleanSnippet: true,
          matchedKeywords: true,
        },
      });
    } catch (dbErr) {
      console.error("Database query error in email-sync status:", dbErr);
    }

    return NextResponse.json({
      isConnected: !!integration && integration.syncStatus === "CONNECTED",
      integration,
      stats: {
        pendingReviewsCount,
        emailVerifiedAppsCount,
        totalEvidencesCount: recentEvidences.length,
      },
      recentEvidences,
    });
  } catch (error: any) {
    console.error("Email sync status error:", error);
    return NextResponse.json({
      isConnected: false,
      integration: null,
      stats: {
        pendingReviewsCount: 0,
        emailVerifiedAppsCount: 0,
        totalEvidencesCount: 0,
      },
      recentEvidences: [],
      message: error?.message || "Failed to fetch email sync status"
    }, { status: 200 });
  }
}
