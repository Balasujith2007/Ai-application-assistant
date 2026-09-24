import { NextResponse } from "next/server";
import { processStudentEmails, IngestableEmail } from "@/lib/emailSync/emailIngestionEngine";
import prisma from "@/lib/prisma";

/**
 * Inbound Webhook for forwarded or incoming email parsing service
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
    const secret = process.env.EMAIL_SYNC_WEBHOOK_SECRET || "career-ai-default-webhook-secret";

    if (authHeader !== `Bearer ${secret}` && authHeader !== secret) {
      return NextResponse.json({ message: "Invalid webhook secret" }, { status: 401 });
    }

    const payload = await req.json();
    const { studentEmail, recipientEmail, subject, bodyText, senderEmail, senderName, messageId } = payload;

    const emailToFind = studentEmail || recipientEmail;
    if (!emailToFind) {
      return NextResponse.json({ message: "Student recipient email is required" }, { status: 400 });
    }

    // Find student by email
    const student = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailToFind },
          { emailIntegration: { emailAddress: emailToFind } },
        ],
      },
    });

    if (!student) {
      return NextResponse.json({ message: `No registered student found for email ${emailToFind}` }, { status: 404 });
    }

    const emailData: IngestableEmail = {
      messageId: messageId || `wh_msg_${Date.now()}`,
      senderEmail: senderEmail || "unknown@company.com",
      senderName: senderName || null,
      subject: subject || "No Subject",
      bodyText: bodyText || "",
      receivedDate: new Date(),
    };

    const report = await processStudentEmails(student.id, [emailData]);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ message: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
