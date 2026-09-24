import dotenv from 'dotenv';
import path from 'path';

// Load local .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import prisma from '../lib/prisma';
import { normalizePhoneNumber } from '../lib/whatsapp/twilio.provider';
import { sendTestWhatsAppMessage, isRealSendEnabled, getActiveWhatsAppProvider } from '../lib/whatsapp/whatsapp.service';

function maskPhone(phone: string): string {
  if (!phone) return 'EMPTY';
  // Mask middle digits: +91 98765 43210 -> +91******3210
  return phone.replace(/(\+\d{2})\d+(\d{4})/, '$1******$2');
}

async function main() {
  console.log('================================================================');
  console.log('       CAREERAI TWILIO WHATSAPP SANDBOX TEST RUNNER            ');
  console.log('================================================================\n');

  // 1. Check & Validate CLI Argument
  const rawRecipient = process.argv[2];
  if (!rawRecipient || !rawRecipient.trim()) {
    console.error('❌ RECIPIENT PHONE NUMBER REQUIRED:');
    console.error('Usage: npx tsx scripts/test-whatsapp-sandbox.ts <RECIPIENT_PHONE>');
    console.error('Example: npx tsx scripts/test-whatsapp-sandbox.ts +91XXXXXXXXXX\n');
    process.exit(1);
  }

  // 2. Validate & Normalize Phone Number
  const phoneValidation = normalizePhoneNumber(rawRecipient);
  if (!phoneValidation.valid || !phoneValidation.e164) {
    console.error(`❌ INVALID PHONE NUMBER FORMAT:`);
    console.error(`   ${phoneValidation.error}`);
    console.error('   Please provide a valid 10-digit Indian number or E.164 formatted number.\n');
    process.exit(1);
  }

  const normalizedPhone = phoneValidation.e164;
  const maskedRecipient = maskPhone(normalizedPhone);

  // 3. Inspect Provider & Real-Send Mode
  const activeProvider = getActiveWhatsAppProvider();
  const realSendEnabled = isRealSendEnabled();
  const configCheck = activeProvider.validateConfiguration();

  const sandboxSender = process.env.TWILIO_WHATSAPP_FROM || 'Not configured';
  const maskedSender = sandboxSender.startsWith('whatsapp:')
    ? `whatsapp:${maskPhone(sandboxSender.replace('whatsapp:', ''))}`
    : maskPhone(sandboxSender);

  console.log('--- 1. Environment & Configuration Check ---');
  console.log(`- Active Provider:         ${activeProvider.name}`);
  console.log(`- Real Sending Allowed:    ${realSendEnabled ? 'YES (WHATSAPP_ALLOW_REAL_SEND=true)' : 'NO (Simulation / Mock Mode)'}`);
  console.log(`- Configured Sender:       ${maskedSender}`);
  console.log(`- Configuration Status:    ${configCheck.valid ? '✅ VALID' : '❌ INVALID'}`);
  if (!configCheck.valid) {
    console.log(`- Missing Variables:       ${configCheck.missingVariables.join(', ')}`);
  }
  console.log(`- Validated Recipient:     ${maskedRecipient}`);

  // 4. Resolve an Authorizing Admin / Super Admin User
  let adminUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true, email: true, role: true },
  });

  if (!adminUser) {
    // Check if any user exists, fallback to first user or system admin placeholder
    const fallbackUser = await prisma.user.findFirst({
      select: { id: true, email: true, role: true },
    });
    if (fallbackUser) {
      adminUser = fallbackUser;
    } else {
      adminUser = { id: 'system-sandbox-tester', email: 'system@careerai.test', role: 'ADMIN' as any };
    }
  }

  console.log(`- Authorizing Actor:       ${adminUser.email} (${adminUser.role})\n`);

  // 5. Send Controlled Single Test Message
  console.log('--- 2. Dispatching WhatsApp Sandbox Test Message ---');
  console.log(`Sending test message to ${maskedRecipient}...`);

  const testMessageText = `CareerAI WhatsApp Sandbox Test 🚀\nTimestamp: ${new Date().toISOString()}`;

  const sendResult = await sendTestWhatsAppMessage({
    recipientPhone: normalizedPhone,
    adminUserId: adminUser.id,
    customText: testMessageText,
  });

  // 6. Print Safe Twilio / Service Result
  console.log('\n--- 3. Delivery & Gateway Execution Result ---');
  console.log(`- Provider:                ${sendResult.provider}`);
  console.log(`- Delivery Status:         ${sendResult.status}`);
  console.log(`- Success:                 ${sendResult.success ? '✅ TRUE' : '❌ FALSE'}`);
  console.log(`- Recipient (Masked):      ${maskedRecipient}`);

  if (sendResult.messageId) {
    console.log(`- Twilio Message SID:      ${sendResult.messageId}`);
  }

  if (sendResult.status === 'SENT') {
    console.log('\n✅ RESULT: Twilio API accepted the WhatsApp Sandbox message for queuing/delivery.');
    console.log(`   Message SID: ${sendResult.messageId}`);
  } else if (sendResult.status === 'MOCKED') {
    console.log('\nℹ️ RESULT: Message simulated successfully via local Mock Provider (safe simulation mode).');
  } else if (sendResult.status === 'SKIPPED') {
    console.log(`\n⚠️ RESULT: Message skipped.`);
    console.log(`   Reason: ${sendResult.skippedReason || 'Policy or opt-out constraint.'}`);
  } else {
    console.log('\n❌ RESULT: WhatsApp Sandbox message delivery FAILED.');
    if (sendResult.error) {
      console.log(`   Error Details: ${sendResult.error}`);
    }
  }

  console.log('\n================================================================');
  console.log('                    TEST EXECUTION COMPLETE                     ');
  console.log('================================================================\n');

  if (!sendResult.success && sendResult.status === 'FAILED') {
    process.exit(2);
  }
}

main()
  .catch((err) => {
    console.error('Sandbox Test Execution Error:', err?.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
