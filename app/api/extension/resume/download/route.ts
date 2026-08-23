import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { corsHeaders, optionsOk } from '@/lib/applyAgent/cors';
import { loadActiveResumeFile, resumeDownloadHeaders } from '@/lib/applyAgent/resumeFile';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

/**
 * Authenticated resume download for the Apply Agent (extension JWT).
 * Used when /test-apply is connected via /connect-extension (no careerai_session_id).
 */
export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders(req) },
    );
  }

  try {
    const file = await loadActiveResumeFile(userId);
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No active resume found.' },
        { status: 404, headers: corsHeaders(req) },
      );
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        ...corsHeaders(req),
        ...resumeDownloadHeaders(file),
      },
    });
  } catch (error: unknown) {
    console.error('Error downloading extension resume:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || 'Failed to download resume.' },
      { status: 500, headers: corsHeaders(req) },
    );
  }
}
