import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Require actual Google OAuth Client ID in environment
  if (
    !clientId ||
    clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE' ||
    clientId.includes('mock')
  ) {
    return NextResponse.json(
      {
        message: 'Google Client ID is missing or set to mock placeholder. Please add your real Google Cloud OAuth Client ID to GOOGLE_CLIENT_ID in your .env file.',
      },
      { status: 400 }
    );
  }

  const scope = 'openid email profile';
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
