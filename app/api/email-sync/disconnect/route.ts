import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await prisma.studentEmailIntegration.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "Email integration disconnected successfully. Tokens deleted.",
    });
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return NextResponse.json({ message: "Failed to disconnect email integration" }, { status: 500 });
  }
}
