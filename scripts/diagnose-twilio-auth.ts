import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function maskString(str: string, keepStart = 4, keepEnd = 4): string {
  if (!str) return 'EMPTY';
  if (str.length <= keepStart + keepEnd) return '***';
  return `${str.substring(0, keepStart)}...${str.substring(str.length - keepEnd)}`;
}

async function runDiagnostic() {
  console.log('======================================================');
  console.log('  🔍 TWILIO API KEY AUTHENTICATION DIAGNOSTIC');
  console.log('======================================================\n');

  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const apiKeySid = (process.env.TWILIO_API_KEY_SID || '').trim();
  const apiKeySecret = (process.env.TWILIO_API_KEY_SECRET || '').trim();

  console.log(`- Account SID: ${maskString(accountSid, 6, 4)} (length: ${accountSid.length})`);
  console.log(`- API Key SID: ${maskString(apiKeySid, 6, 4)} (length: ${apiKeySid.length})`);
  console.log(`- Secret Length: ${apiKeySecret.length} chars (Masked: ${maskString(apiKeySecret, 2, 2)})`);
  console.log(`- Account SID prefix: ${accountSid.startsWith('AC') ? '✅ Starts with AC' : '❌ Does not start with AC'}`);
  console.log(`- API Key SID prefix: ${apiKeySid.startsWith('SK') ? '✅ Starts with SK' : '❌ Does not start with SK'}`);

  if (!accountSid || !apiKeySid || !apiKeySecret) {
    console.error('\n❌ Missing required variables.');
    return;
  }

  const basicAuth = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64');

  // Test 1: Query Account Details (Read-Only)
  console.log('\n--- 1. Testing Read-Only Query: GET /Accounts/{AccountSid}.json ---');
  const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
  
  try {
    const res = await fetch(accountUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
    });

    const body = await res.json().catch(() => ({}));

    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      console.log(`✅ API Key successfully authenticated!`);
      console.log(`Account Friendly Name: "${body.friendly_name || 'N/A'}"`);
      console.log(`Account Status: "${body.status || 'N/A'}"`);
      console.log(`Account Type: "${body.type || 'N/A'}"`);
    } else {
      console.log(`❌ Authentication Failed: Code ${body.code || 'N/A'}`);
      console.log(`Message: "${body.message || res.statusText}"`);
      if (body.more_info) {
        console.log(`More Info URL: ${body.more_info}`);
      }
    }
  } catch (err: any) {
    console.error(`Network Exception: ${err?.message || err}`);
  }

  // Test 2: Check Key Details (Read-Only)
  console.log('\n--- 2. Testing Read-Only Query: GET /Accounts/{AccountSid}/Keys/{ApiKeySid}.json ---');
  const keyUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Keys/${apiKeySid}.json`;

  try {
    const res2 = await fetch(keyUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
    });

    const body2 = await res2.json().catch(() => ({}));

    console.log(`HTTP Status: ${res2.status} ${res2.statusText}`);
    if (res2.ok) {
      console.log(`✅ API Key SID confirmed under Account ${maskString(accountSid, 6, 4)}!`);
      console.log(`Key Friendly Name: "${body2.friendly_name || 'N/A'}"`);
      console.log(`Date Created: "${body2.date_created || 'N/A'}"`);
    } else {
      console.log(`❌ Key Lookup Failed: Code ${body2.code || 'N/A'}`);
      console.log(`Message: "${body2.message || res2.statusText}"`);
    }
  } catch (err: any) {
    console.error(`Network Exception: ${err?.message || err}`);
  }

  console.log('\n======================================================');
  console.log('  📋 DIAGNOSTIC SUMMARY');
  console.log('======================================================\n');
}

runDiagnostic();
