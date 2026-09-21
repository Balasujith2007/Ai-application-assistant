import { WhatsAppProvider, SendWhatsAppOptions, SendWhatsAppResult } from './types';

export class MockWhatsAppProvider implements WhatsAppProvider {
  public readonly name = 'mock' as const;

  public validateConfiguration(): { valid: boolean; missingVariables: string[]; message?: string } {
    return {
      valid: true,
      missingVariables: [],
      message: 'Mock WhatsApp Provider is active (safe local simulation mode)',
    };
  }

  public async sendMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
    const { to, message, notificationType, userId } = options;
    const sanitizedTo = to ? to.trim() : 'UNKNOWN';
    const mockMessageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Safe simulated logging without secrets
    console.log(`[MockWhatsAppProvider] [SIMULATED] WhatsApp notification sent.`);
    console.log(`[MockWhatsAppProvider] Recipient: ${sanitizedTo}`);
    console.log(`[MockWhatsAppProvider] Type: ${notificationType || 'GENERAL'}`);
    console.log(`[MockWhatsAppProvider] UserID: ${userId || 'N/A'}`);
    console.log(`[MockWhatsAppProvider] Message Content Preview: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    console.log(`[MockWhatsAppProvider] Simulated MessageId: ${mockMessageId}`);

    return {
      success: true,
      status: 'MOCKED',
      provider: 'mock',
      messageId: mockMessageId,
      recipientPhone: sanitizedTo,
    };
  }
}

export const mockWhatsAppProvider = new MockWhatsAppProvider();
