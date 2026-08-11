import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/serverAuth';

export async function GET(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    console.error('Google OAuth Access Denied by User:', errorParam);
    return NextResponse.redirect(`${baseUrl}/login?error=GoogleAccessDenied`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=NoCodeProvided`);
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    // 1. Exchange authorization code for Google access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Failed to obtain Google token:', tokenData);
      const reason = tokenData.error_description || tokenData.error || 'TokenExchangeFailed';
      return NextResponse.redirect(
        `${baseUrl}/login?error=GoogleTokenExchangeFailed&reason=${encodeURIComponent(reason)}`
      );
    }

    // 2. Fetch real user profile from Google UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await userRes.json();

    if (!userRes.ok || !profile || !profile.email) {
      console.error('Failed to fetch Google user profile:', profile);
      return NextResponse.redirect(`${baseUrl}/login?error=GoogleProfileFetchFailed`);
    }

    // 3. Find existing user by googleId or email, or create new user for their specific Google Account
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.id }, { email: profile.email }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || profile.given_name || profile.email.split('@')[0],
          googleId: profile.id,
          role: 'STUDENT',
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          name: user.name || profile.name || profile.given_name,
        },
      });
    }

    // 4. Generate JWT session token for their personal user account
    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      googleId: user.googleId,
    };

    // 5. Redirect to frontend auth callback page to log into THEIR personal account
    return NextResponse.redirect(
      `${baseUrl}/auth/callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(
        JSON.stringify(userData)
      )}`
    );
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    return NextResponse.redirect(`${baseUrl}/login?error=OAuthCallbackError`);
  }
}
