import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { sendTestWhatsAppMessage, isRealSendEnabled, getActiveWhatsAppProvider } from '@/lib/whatsapp/whatsapp.service';
import { normalizePhoneNumber } from '@/lib/whatsapp/twilio.provider';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only Admins or Super Admins can trigger WhatsApp tests.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { recipientPhone: requestedPhone, customMessage } = body;

    // Use requested phone or fallback to admin's profile phone
    const targetPhone = requestedPhone || user.profile?.phone;
    if (!targetPhone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Recipient phone number is required. Please provide a phone number or configure one in your profile.',
        },
        { status: 400 }
      );
    }

    const phoneValidation = normalizePhoneNumber(targetPhone);
    if (!phoneValidation.valid || !phoneValidation.e164) {
      return NextResponse.json(
        {
          success: false,
          message: phoneValidation.error || 'Invalid phone number format.',
        },
        { status: 400 }
      );
    }

    const provider = getActiveWhatsAppProvider();
    const realSendEnabled = isRealSendEnabled();
    const configCheck = provider.validateConfiguration();

    if (provider.name === 'twilio' && !configCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          provider: 'twilio',
          message: configCheck.message || 'Twilio configuration is incomplete.',
          missingVariables: configCheck.missingVariables,
        },
        { status: 400 }
      );
    }

    const messageToSend = customMessage || 'CareerAI WhatsApp Integration Test 🚀';

    // Dispatch the test message
    const result = await sendTestWhatsAppMessage({
      recipientPhone: phoneValidation.e164,
      adminUserId: user.id,
      customText: messageToSend,
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      provider: result.provider,
      messageId: result.messageId,
      recipientPhone: phoneValidation.e164,
      realSendEnabled,
      error: result.error,
      skippedReason: result.skippedReason,
      info:
        result.status === 'MOCKED'
          ? 'Message was simulated locally via Mock Provider. No real WhatsApp message sent.'
          : result.status === 'SENT'
          ? 'Real WhatsApp message successfully dispatched to Twilio Sandbox.'
          : undefined,
    });
  } catch (error: any) {
    console.error('[AdminWhatsAppTest] Error:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error processing test message.',
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const provider = getActiveWhatsAppProvider();
    const realSend = isRealSendEnabled();
    const config = provider.validateConfiguration();

    // Check delivery logs
    const recentDeliveries = await prisma.notificationDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        recipientPhone: true,
        notificationType: true,
        provider: true,
        providerMessageId: true,
        status: true,
        failureReason: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      activeProvider: provider.name,
      realSendEnabled: realSend,
      configValid: config.valid,
      configMessage: config.message,
      missingVariables: config.missingVariables,
      fromSender: process.env.TWILIO_WHATSAPP_FROM ? 'Configured' : 'Not configured',
      recentDeliveries,
    });
  } catch (error: any) {
    console.error('[AdminWhatsAppStatus] Error:', error?.message || error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
