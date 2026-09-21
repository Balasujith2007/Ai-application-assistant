export type WhatsAppProviderType = 'mock' | 'twilio';

export type WhatsAppDeliveryStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'SKIPPED'
  | 'MOCKED';

export interface SendWhatsAppOptions {
  to: string; // Recipient phone number (e.g. +919876543210 or 9876543210)
  message: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  userId?: string;
  notificationType?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  status: WhatsAppDeliveryStatus;
  provider: WhatsAppProviderType;
  messageId?: string;
  error?: string;
  skippedReason?: string;
  recipientPhone?: string;
}

export interface WhatsAppProvider {
  name: WhatsAppProviderType;
  sendMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult>;
  validateConfiguration(): { valid: boolean; missingVariables: string[]; message?: string };
}
