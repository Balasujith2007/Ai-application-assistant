import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1' || lower === '0.0.0.0') return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;

  // IPv4 check
  const parts = lower.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawUrl = body.url || body.opportunityUrl;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json({ message: 'Opportunity URL is required.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      return NextResponse.json({ message: 'Please enter a valid HTTP/HTTPS URL.' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ message: 'Only HTTP and HTTPS URLs are supported.' }, { status: 400 });
    }

    if (isPrivateHost(parsedUrl.hostname)) {
      return NextResponse.json({ message: 'Invalid or restricted target URL.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let html = '';
    try {
      const response = await fetch(parsedUrl.href, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          message: `Unable to fetch page content (HTTP ${response.status}).`
        }, { status: 400 });
      }

      const reader = response.body?.getReader();
      if (reader) {
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            receivedLength += value.length;
            chunks.push(value);
            if (receivedLength > 1024 * 1024) { // 1MB limit
              reader.cancel();
              break;
            }
          }
        }
        const combined = new Uint8Array(receivedLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        html = new TextDecoder('utf-8').decode(combined);
      } else {
        html = await response.text();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      return NextResponse.json({
        success: false,
        message: 'Request timed out or could not reach the target URL.'
      }, { status: 400 });
    }

    // Extract OpenGraph, Meta, and JSON-LD metadata
    const getMetaTag = (property: string) => {
      const regex = new RegExp(`<meta\\s+(?:name|property)=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      if (match) return match[1];
      const revRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${property}["']`, 'i');
      const revMatch = html.match(revRegex);
      return revMatch ? revMatch[1] : null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    const ogTitle = getMetaTag('og:title') || getMetaTag('twitter:title') || pageTitle;
    const ogDesc = getMetaTag('og:description') || getMetaTag('description') || getMetaTag('twitter:description') || '';
    const ogSiteName = getMetaTag('og:site_name') || '';

    // Detect Opportunity Type
    const fullContentText = `${ogTitle} ${ogDesc} ${pageTitle}`.toLowerCase();
    let type = 'OTHER';
    if (fullContentText.includes('hackathon') || fullContentText.includes('coding challenge') || fullContentText.includes('ideathon')) {
      type = 'HACKATHON';
    } else if (fullContentText.includes('intern') || fullContentText.includes('internship') || fullContentText.includes('trainee')) {
      type = 'INTERNSHIP';
    } else if (fullContentText.includes('job') || fullContentText.includes('full time') || fullContentText.includes('engineer') || fullContentText.includes('developer')) {
      type = 'JOB';
    } else if (fullContentText.includes('contest') || fullContentText.includes('competition') || fullContentText.includes('tournament')) {
      type = 'COMPETITION';
    } else if (fullContentText.includes('scholarship') || fullContentText.includes('grant') || fullContentText.includes('fellowship')) {
      type = 'SCHOLARSHIP';
    } else if (fullContentText.includes('workshop') || fullContentText.includes('bootcamp') || fullContentText.includes('webinar')) {
      type = 'WORKSHOP';
    }

    // Organization Extraction
    let organization = ogSiteName;
    if (!organization) {
      if (parsedUrl.hostname.includes('unstop')) organization = 'Unstop';
      else if (parsedUrl.hostname.includes('devfolio')) organization = 'Devfolio';
      else if (parsedUrl.hostname.includes('linkedin')) organization = 'LinkedIn';
      else if (parsedUrl.hostname.includes('internshala')) organization = 'Internshala';
      else {
        const parts = parsedUrl.hostname.replace('www.', '').split('.');
        organization = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }

    // Clean title
    let title = ogTitle;
    if (title.includes('|')) title = title.split('|')[0].trim();
    if (title.includes('-')) title = title.split('-')[0].trim();

    // Mode & Location
    let mode = 'ONLINE';
    let location = 'Online';
    if (fullContentText.includes('remote') || fullContentText.includes('online') || fullContentText.includes('virtual')) {
      mode = 'ONLINE';
      location = 'Online';
    } else if (fullContentText.includes('hybrid')) {
      mode = 'HYBRID';
      location = 'Hybrid';
    } else if (fullContentText.includes('on-site') || fullContentText.includes('onsite') || fullContentText.includes('office')) {
      mode = 'OFFLINE';
      location = 'On-site';
    }

    // Detect Registration Link in HTML
    let detectedRegistrationUrl = '';
    let isRegistrationDetected = false;

    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;
    const keywords = ['register', 'apply now', 'apply', 'registration', 'participate', 'join'];

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').toLowerCase().trim();

      if (keywords.some((k) => text.includes(k))) {
        try {
          const absUrl = new URL(href, parsedUrl.href).href;
          if (absUrl.startsWith('http://') || absUrl.startsWith('https://')) {
            detectedRegistrationUrl = absUrl;
            isRegistrationDetected = true;
            break;
          }
        } catch {}
      }
    }

    if (!detectedRegistrationUrl) {
      detectedRegistrationUrl = parsedUrl.href;
    }

    const fetchedData = {
      title: title || 'Opportunity Details',
      organization: organization || 'Official Host',
      type,
      description: ogDesc ? ogDesc.substring(0, 500) : '',
      opportunityUrl: parsedUrl.href,
      registrationUrl: detectedRegistrationUrl,
      isRegistrationDetected,
      location,
      mode,
      applicationDeadline: null,
      skills: [],
      eligibility: '',
      stipend: '',
      prize: ''
    };

    return NextResponse.json({
      success: true,
      data: fetchedData
    });

  } catch (error) {
    console.error('Error fetching opportunity details:', error);
    return NextResponse.json({ success: false, message: 'Failed to extract opportunity details.' }, { status: 500 });
  }
}
