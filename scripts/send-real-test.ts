import dotenv from 'dotenv';
import path from 'path';

// Load local .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import prisma from '../lib/prisma';
import { signToken } from '../lib/serverAuth';
import { normalizePhoneNumber } from '../lib/whatsapp/twilio.provider';

async function main() {
  console.log('======================================================');
  console.log('  🔍 STEP 1: VERIFYING CONFIGURATION & ENVIRONMENT');
  console.log('======================================================\n');

  const providerName = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase().trim();
  const allowRealSend = process.env.WHATSAPP_ALLOW_REAL_SEND === 'true';

  console.log(`- WHATSAPP_PROVIDER: ${providerName}`);
  console.log(`- WHATSAPP_ALLOW_REAL_SEND: ${allowRealSend}`);
  console.log(`- TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configured (set)' : '❌ Not set'}`);
  console.log(`- TWILIO_API_KEY_SID: ${process.env.TWILIO_API_KEY_SID ? '✅ Configured (set)' : '❌ Not set'}`);
  console.log(`- TWILIO_API_KEY_SECRET: ${process.env.TWILIO_API_KEY_SECRET ? '✅ Configured (set)' : '❌ Not set'}`);
  console.log(`- TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || 'Not set'}`);
  console.log(`- WHATSAPP_DAILY_LIMIT: ${process.env.WHATSAPP_DAILY_LIMIT || '10'}`);
  console.log(`- WHATSAPP_MONTHLY_LIMIT: ${process.env.WHATSAPP_MONTHLY_LIMIT || '100'}`);

  const missingVars: string[] = [];
  if (!process.env.TWILIO_ACCOUNT_SID) missingVars.push('TWILIO_ACCOUNT_SID');
  if (!process.env.TWILIO_API_KEY_SID) missingVars.push('TWILIO_API_KEY_SID');
  if (!process.env.TWILIO_API_KEY_SECRET) missingVars.push('TWILIO_API_KEY_SECRET');
  if (!process.env.TWILIO_WHATSAPP_FROM) missingVars.push('TWILIO_WHATSAPP_FROM');

  if (missingVars.length > 0) {
    console.error('\n❌ CONFIGURATION STOPPED:');
    console.error(`The following required environment variables are not yet populated in .env:`);
    for (const v of missingVars) {
      console.error(`  - ${v}`);
    }
    console.error(`\nPlease configure these in your .env file before running the real Twilio Sandbox test.`);
    process.exit(1);
  }

  if (providerName !== 'twilio') {
    console.error('\n❌ SAFETY CHECK FAILED: WHATSAPP_PROVIDER is not set to "twilio" (currently: "' + providerName + '").');
    console.error('Please set WHATSAPP_PROVIDER=twilio in .env to proceed with real Twilio Sandbox test.');
    process.exit(1);
  }

  if (!allowRealSend) {
    console.error('\n❌ SAFETY CHECK FAILED: WHATSAPP_ALLOW_REAL_SEND is not set to "true".');
    console.error('Please set WHATSAPP_ALLOW_REAL_SEND=true in .env to explicitly allow real message dispatch.');
    process.exit(1);
  }

  // Get recipient phone from CLI args (e.g. tsx scripts/send-real-test.ts +91XXXXXXXXXX)
  const rawRecipient = process.argv[2];
  if (!rawRecipient) {
    console.error('\n❌ RECIPIENT REQUIRED:');
    console.error('Please specify your approved Sandbox recipient phone number as a parameter.');
    console.error('Example: npx tsx scripts/send-real-test.ts +919876543210');
    process.exit(1);
  }

  const phoneCheck = normalizePhoneNumber(rawRecipient);
  if (!phoneCheck.valid || !phoneCheck.e164) {
    console.error(`\n❌ INVALID RECIPIENT PHONE: ${phoneCheck.error}`);
    process.exit(1);
  }

  console.log(`\n- Validated Recipient: ${phoneCheck.e164}`);

  // Fetch admin user
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
  });

  if (!admin) {
    console.error('\n❌ No Admin/Super Admin user found in database to authorize test.');
    process.exit(1);
  }

  console.log(`- Authorizing Admin: ${admin.email} (${admin.role})`);

  // Generate Admin JWT Token
  const token = signToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  console.log('\n======================================================');
  console.log('  🚀 STEP 2: DISPATCHING SINGLE TEST MESSAGE');
  console.log('======================================================\n');

  console.log(`Calling Service: sendTestWhatsAppMessage()`);
  console.log(`Recipient Phone: ${phoneCheck.e164}`);
  console.log(`Message Text: "CareerAI WhatsApp Integration Test 🚀"`);
  console.log(`Triggered By: ${admin.email} (${admin.id})`);

  const { sendTestWhatsAppMessage } = await import('../lib/whatsapp/whatsapp.service');

  const result = await sendTestWhatsAppMessage({
    recipientPhone: phoneCheck.e164,
    adminUserId: admin.id,
    customText: 'CareerAI WhatsApp Integration Test 🚀',
  });

  console.log('\n======================================================');
  console.log('  📊 STEP 3: TWILIO SANDBOX RESPONSE REPORT');
  console.log('======================================================\n');
  console.log(`Success: ${result.success ? '✅ TRUE' : '❌ FALSE'}`);
  console.log(`Delivery Status: ${result.status}`);
  console.log(`Provider: ${result.provider}`);
  if (result.messageId) {
    console.log(`Message SID: ${result.messageId}`);
  }
  if (result.error) {
    console.log(`Error/Notice: ${result.error}`);
  }
  if (result.skippedReason) {
    console.log(`Skipped Reason: ${result.skippedReason}`);
  }
}

main()
  .catch((err) => {
    console.error('Execution error:', err?.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
