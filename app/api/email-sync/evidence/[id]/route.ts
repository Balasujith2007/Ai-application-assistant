import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if id is an evidenceId or applicationId
    let evidence = await prisma.emailEvidence.findUnique({
      where: { id },
    });

    if (!evidence) {
      evidence = await prisma.emailEvidence.findFirst({
        where: { applicationId: id, studentId: userId },
        orderBy: { receivedDate: "desc" },
      });
    }

    if (!evidence) {
      return NextResponse.json({ message: "No email evidence found." }, { status: 404 });
    }

    // Strict privacy constraint: Only the student who owns the email or system admin can view evidence
    if (evidence.studentId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || (user.role !== "STUDENT" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return NextResponse.json({ message: "Forbidden. Email evidence is private to the applicant." }, { status: 403 });
      }
    }

    return NextResponse.json({
      id: evidence.id,
      companyName: evidence.companyName,
      detectedStatus: evidence.detectedStatus,
      confidence: evidence.confidence,
      receivedDate: evidence.receivedDate,
      senderEmail: evidence.senderEmail,
      senderName: evidence.senderName,
      subject: evidence.subject,
      cleanSnippet: evidence.cleanSnippet,
      matchedKeywords: evidence.matchedKeywords,
      isVerified: evidence.isVerified,
    });
  } catch (error: any) {
    console.error("Fetch evidence error:", error);
    return NextResponse.json({ message: "Failed to fetch email evidence" }, { status: 500 });
  }
}
