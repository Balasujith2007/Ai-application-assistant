import dotenv from 'dotenv';
import path from 'path';

// Load local .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { sendOpportunityWhatsApp } from '../lib/whatsapp/whatsapp.service';
import { normalizePhoneNumber } from '../lib/whatsapp/twilio.provider';

function maskPhone(phone: string): string {
  if (!phone) return 'EMPTY';
  return phone.replace(/(\+\d{2})\d+(\d{4})/, '$1******$2');
}

async function main() {
  console.log('================================================================');
  console.log('   CAREERAI TWILIO CONTENT TEMPLATE (ContentSid) TEST RUNNER    ');
  console.log('================================================================\n');

  const templateSid = (process.env.TWILIO_OPPORTUNITY_TEMPLATE_SID || '').trim();
  const provider = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase().trim();
  const allowReal = process.env.WHATSAPP_ALLOW_REAL_SEND === 'true';

  console.log('--- 1. Template Configuration Check ---');
  console.log(`- TWILIO_OPPORTUNITY_TEMPLATE_SID: ${templateSid ? `Configured (${templateSid.substring(0, 4)}...${templateSid.substring(templateSid.length - 4)})` : 'NOT SET (Optional in Sandbox freeform mode)'}`);
  console.log(`- Provider:                        ${provider}`);
  console.log(`- Real Send Allowed:               ${allowReal}`);

  // Test variable mapping
  console.log('\n--- 2. Content Template Variable Mapping Verification ---');
  const mockStudent = {
    id: 'test-student-id-123',
    name: 'Aarav Sharma',
    phone: '+919876543210',
  };

  const mockOpportunity = {
    id: 'opp-template-test-456',
    title: 'Google Cloud Solutions Internship 2026',
    type: 'INTERNSHIP',
    organization: 'Google Cloud India',
    applicationDeadline: new Date('2026-11-30T18:30:00.000Z'),
  };

  const deadlineStr = new Date(mockOpportunity.applicationDeadline).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const expectedVariables = {
    '1': mockStudent.name,
    '2': 'Internship',
    '3': mockOpportunity.title,
    '4': mockOpportunity.organization,
    '5': deadlineStr,
    '6': `${baseUrl}/dashboard/student/opportunities`,
  };

  console.log('Mapped Template Variables:');
  console.log(`  {{1}} studentName       = "${expectedVariables['1']}"`);
  console.log(`  {{2}} opportunityType   = "${expectedVariables['2']}"`);
  console.log(`  {{3}} opportunityTitle  = "${expectedVariables['3']}"`);
  console.log(`  {{4}} companyName       = "${expectedVariables['4']}"`);
  console.log(`  {{5}} deadline          = "${expectedVariables['5']}"`);
  console.log(`  {{6}} opportunityLink   = "${expectedVariables['6']}"`);

  console.log('\n--- 3. Testing Notification Formatting & Dispatch ---');
  const result = await sendOpportunityWhatsApp({
    student: mockStudent,
    opportunity: mockOpportunity,
  });

  console.log(`- Status:               ${result.status}`);
  console.log(`- Success:              ${result.success ? '✅ TRUE' : '❌ FALSE'}`);
  console.log(`- Provider:             ${result.provider}`);
  if (result.messageId) {
    console.log(`- Message SID:          ${result.messageId}`);
  }
  if (result.error) {
    console.log(`- Notice / Error:       ${result.error}`);
  }

  console.log('\n--- 4. Template & Sandbox Distinctions ---');
  console.log('ℹ️ Sandbox Freeform Messaging:');
  console.log('   Twilio Sandbox allows freeform text messaging to enrolled sandbox numbers within an active 24-hr session window.');
  console.log('ℹ️ Production Template Messaging (ContentSid):');
  console.log('   In production WhatsApp Business API, Meta requires pre-approved Content Templates for business-initiated outbound notifications outside the 24-hr window.');
  console.log(`   Current Template Status: ${templateSid ? 'Template SID is configured in environment.' : 'Template SID not configured in .env; falling back cleanly to structured message body.'}`);

  console.log('\n================================================================');
  console.log('                TEMPLATE TEST COMPLETED                         ');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Template test error:', err);
  process.exit(1);
});
