// Force mock mode for automated test suite execution
process.env.WHATSAPP_PROVIDER = 'mock';
process.env.WHATSAPP_ALLOW_REAL_SEND = 'false';

import prisma from '../lib/prisma';
import { normalizePhoneNumber, TwilioWhatsAppProvider } from '../lib/whatsapp/twilio.provider';
import { MockWhatsAppProvider } from '../lib/whatsapp/mock.provider';
import {
  sendWhatsAppNotification,
  sendOpportunityWhatsApp,
  sendRegistrationStatusWhatsApp,
  sendTestWhatsAppMessage,
} from '../lib/whatsapp/whatsapp.service';
import { checkWhatsAppRateLimits } from '../lib/whatsapp/rateLimiter';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  🧪 RUNNING CAREERAI WHATSAPP TEST SUITE');
  console.log('======================================================\n');

  // TEST 1: Phone Normalization
  console.log('--- 1. Phone Number Normalization Tests ---');
  const indian10 = normalizePhoneNumber('9876543210');
  assert(indian10.valid && indian10.e164 === '+919876543210', 'Convert 10-digit Indian number to +91 E.164');

  const indianWith0 = normalizePhoneNumber('09876543210');
  assert(indianWith0.valid && indianWith0.e164 === '+919876543210', 'Convert 0-prefixed Indian number to +91 E.164');

  const indianWith91 = normalizePhoneNumber('919876543210');
  assert(indianWith91.valid && indianWith91.e164 === '+919876543210', 'Convert 91-prefixed Indian number to +91 E.164');

  const formattedWhatsApp = normalizePhoneNumber('whatsapp:+919876543210');
  assert(formattedWhatsApp.valid && formattedWhatsApp.formattedWhatsApp === 'whatsapp:+919876543210', 'Handle pre-formatted whatsapp:+E.164');

  const invalidPhone = normalizePhoneNumber('12345');
  assert(!invalidPhone.valid, 'Reject invalid/short phone numbers');

  const emptyPhone = normalizePhoneNumber('');
  assert(!emptyPhone.valid, 'Reject empty phone numbers');

  // TEST 2: Mock Provider Tests
  console.log('\n--- 2. Mock Provider Tests ---');
  const mockProvider = new MockWhatsAppProvider();
  const mockConfig = mockProvider.validateConfiguration();
  assert(mockConfig.valid, 'Mock Provider configuration is always valid');

  const mockSend = await mockProvider.sendMessage({
    to: '+919876543210',
    message: 'Test mock message',
    notificationType: 'TEST',
  });
  assert(mockSend.success && mockSend.status === 'MOCKED', 'Mock Provider returns status MOCKED without external API call');
  assert(Boolean(mockSend.messageId && mockSend.messageId.startsWith('mock_wa_')), 'Mock Provider generates simulated message ID');

  // TEST 3: Twilio Provider Configuration Validation
  console.log('\n--- 3. Twilio Configuration Validation ---');
  const twilioProvider = new TwilioWhatsAppProvider();
  const savedAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const savedApiKeySid = process.env.TWILIO_API_KEY_SID;
  const savedApiKeySecret = process.env.TWILIO_API_KEY_SECRET;

  // Temporarily unset to test validation
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_API_KEY_SID;
  delete process.env.TWILIO_API_KEY_SECRET;

  const incompleteConfig = twilioProvider.validateConfiguration();
  assert(!incompleteConfig.valid, 'Twilio rejects missing credentials');
  assert(incompleteConfig.missingVariables.includes('TWILIO_ACCOUNT_SID'), 'Detects missing TWILIO_ACCOUNT_SID');

  // Restore env
  if (savedAccountSid) process.env.TWILIO_ACCOUNT_SID = savedAccountSid;
  if (savedApiKeySid) process.env.TWILIO_API_KEY_SID = savedApiKeySid;
  if (savedApiKeySecret) process.env.TWILIO_API_KEY_SECRET = savedApiKeySecret;

  // TEST 4: Service Layer Opt-Out and Missing Phone Handling
  console.log('\n--- 4. User Consent & Opt-Out Handling ---');
  // Find a test user or simulate
  const testUser = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
  });

  if (testUser) {
    // Test missing phone
    const missingPhoneResult = await sendWhatsAppNotification({
      to: '',
      userId: testUser.id,
      message: 'Test message',
      notificationType: 'TEST',
    });
    assert(missingPhoneResult.status === 'SKIPPED' || missingPhoneResult.status === 'MOCKED', 'Gracefully skips/handles missing phone without crashing');
  }

  // TEST 5: Idempotency & Duplicate Suppression
  console.log('\n--- 5. Idempotency Check ---');
  const testKey = `test_idempotency_${Date.now()}`;
  const firstSend = await sendWhatsAppNotification({
    to: '+919876543210',
    message: 'First send',
    idempotencyKey: testKey,
    notificationType: 'TEST',
  });
  assert(firstSend.status === 'MOCKED' || firstSend.status === 'SENT', 'First send processed');

  const secondSend = await sendWhatsAppNotification({
    to: '+919876543210',
    message: 'Duplicate send',
    idempotencyKey: testKey,
    notificationType: 'TEST',
  });
  assert(secondSend.success === true, 'Duplicate send safely returns existing status');

  // TEST 6: Rate Limiter
  console.log('\n--- 6. Rate Limiter Validation ---');
  const rateLimit = await checkWhatsAppRateLimits();
  assert(typeof rateLimit.allowed === 'boolean', 'Rate limit check executes successfully');
  assert(typeof rateLimit.dailyLimit === 'number' && rateLimit.dailyLimit > 0, 'Rate limiter daily limit configured');

  // TEST 7: Opportunity Message Template Formatting
  console.log('\n--- 7. Opportunity Message Formatting ---');
  const oppResult = await sendOpportunityWhatsApp({
    student: { id: 'test_student', name: 'Alex Doe', phone: '+919876543210' },
    opportunity: {
      id: 'opp_123',
      title: 'AI Engineer Internship',
      type: 'INTERNSHIP',
      organization: 'Tech Labs Inc',
      applicationDeadline: new Date('2026-10-15'),
    },
  });
  assert(oppResult.status === 'MOCKED' || oppResult.status === 'SENT', 'Opportunity notification dispatched');

  // TEST 8: Registration Status Message Formatting
  console.log('\n--- 8. Registration Status Formatting ---');
  const regResult = await sendRegistrationStatusWhatsApp({
    student: { id: 'test_student', name: 'Alex Doe', phone: '+919876543210' },
    opportunityTitle: 'AI Engineer Internship',
    status: 'VERIFIED',
    notes: 'Proof verified automatically by Apply Agent.',
  });
  assert(regResult.status === 'MOCKED' || regResult.status === 'SENT', 'Registration status update dispatched');

  // TEST 9: Single Admin Test Message Dispatching
  console.log('\n--- 9. Single Admin Test Message ---');
  const adminTestResult = await sendTestWhatsAppMessage({
    recipientPhone: '+919876543210',
    adminUserId: 'admin_test_id',
    customText: 'CareerAI WhatsApp Integration Test 🚀',
  });
  assert(adminTestResult.status === 'MOCKED' || adminTestResult.status === 'SENT', 'Single test message dispatched');

  console.log('\n======================================================');
  console.log(`  📊 RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
