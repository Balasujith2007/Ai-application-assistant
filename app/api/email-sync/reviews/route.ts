import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const reviews = await prisma.emailStatusReview.findMany({
      where: {
        studentId: userId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews || []);
  } catch (error: any) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reviewId, action, applicationId } = body;

    if (!reviewId || !action) {
      return NextResponse.json({ message: "reviewId and action are required." }, { status: 400 });
    }

    const review = await prisma.emailStatusReview.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.studentId !== userId) {
      return NextResponse.json({ message: "Review not found or unauthorized." }, { status: 404 });
    }

    if (action === "DISMISS") {
      await prisma.emailStatusReview.update({
        where: { id: reviewId },
        data: { status: "DISMISSED" },
      });
      return NextResponse.json({ success: true, message: "Review dismissed." });
    }

    if (action === "CONFIRM") {
      if (!applicationId) {
        return NextResponse.json({ message: "Target applicationId is required for confirmation." }, { status: 400 });
      }

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application || application.userId !== userId) {
        return NextResponse.json({ message: "Target application not found." }, { status: 404 });
      }

      // Create verified email evidence
      await prisma.emailEvidence.create({
        data: {
          applicationId: application.id,
          studentId: userId,
          sourceMessageId: review.sourceMessageId,
          senderEmail: review.senderEmail,
          senderName: review.senderName,
          companyName: review.detectedCompany || application.companyName,
          detectedStatus: review.detectedStatus,
          confidence: review.confidence,
          receivedDate: review.createdAt,
          subject: review.subject,
          cleanSnippet: review.cleanSnippet,
          matchedKeywords: ["Student Confirmed"],
          isVerified: true,
        },
      });

      // Update application status with company email evidence
      await prisma.application.update({
        where: { id: application.id },
        data: {
          status: review.detectedStatus,
          statusSource: "COMPANY_EMAIL",
          statusConfidence: 1.0,
          statusUpdatedAt: new Date(),
        },
      });

      // Update review status
      await prisma.emailStatusReview.update({
        where: { id: reviewId },
        data: {
          status: "CONFIRMED",
          resolvedAppId: application.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Application for ${application.companyName} updated to ${review.detectedStatus}.`,
      });
    }

    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Resolve review error:", error);
    return NextResponse.json({ message: error.message || "Failed to resolve review" }, { status: 500 });
  }
}
