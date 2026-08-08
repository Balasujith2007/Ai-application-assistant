import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return NextResponse.json(
      { message: 'Google Client ID is not configured in .env' },
      { status: 500 }
    );
  }

  const scope = 'openid email profile';
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
