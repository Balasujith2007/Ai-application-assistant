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

    // Increased timeout to 15 seconds for slow or external job portals
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let html = '';
    try {
      const response = await fetch(parsedUrl.href, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
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
            if (receivedLength > 2 * 1024 * 1024) { // 2MB limit
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
        message: 'Request timed out or target site blocked automated fetch. Please fill details manually or check URL.'
      }, { status: 400 });
    }

    let title = '';
    let organization = '';
    let description = '';
    let registrationUrl = '';
    let location = '';
    let type = '';
    let stipend = '';
    let salary = '';
    let isRegistrationDetected = false;

    // --- 1. NEXT.JS RSC / PROPS / JSON PAYLOAD PARSING ---

    // Extract websiteLink / registrationUrl / applyUrl from JSON/RSC payloads
    const websiteLinkMatch = html.match(/\\?"(websiteLink|registrationUrl|applyUrl|jobUrl|applyLink)\\?":\s*\\?"(https?:[^\\"]+)\\?"/i);
    if (websiteLinkMatch) {
      registrationUrl = websiteLinkMatch[2].replace(/\\/g, '');
      isRegistrationDetected = true;
    }

    // Extract description from dangerouslySetInnerHTML or RSC
    const rscMatches = html.match(/self\.__next_f\.push\(([\s\S]*?)\)/g) || [];
    for (const matchStr of rscMatches) {
      if (!description && matchStr.includes('dangerouslySetInnerHTML')) {
        const descMatch = matchStr.match(/\\?"dangerouslySetInnerHTML\\?":\{\\?"__html\\?":\\?"([\s\S]*?)\\?"\}/);
        if (descMatch) {
          description = descMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
    }

    // --- 2. HTML STRUCTURE PARSING (h1, img alt, p) ---

    // Check if H1 is company name and sibling P is job title
    const h1AndP = html.match(/<h1[^>]*>(.*?)<\/h1>\s*<p[^>]*>(.*?)<\/p>/i);
    if (h1AndP) {
      const candidateOrg = h1AndP[1].replace(/<[^>]+>/g, '').trim();
      const candidateTitle = h1AndP[2].replace(/<[^>]+>/g, '').trim();
      if (candidateOrg && candidateTitle && !candidateOrg.toLowerCase().includes('hiretoday') && candidateOrg.length < 60) {
        organization = candidateOrg;
        title = candidateTitle;
      }
    }

    const altImgMatch = html.match(/<img[^>]+alt=["']([^"']+)["'][^>]*class=["'][^"']*(?:company|logo|org)[^"']*["']/i) ||
                        html.match(/<img[^>]+alt=["']([^"']+)["']/i);

    if (!organization && altImgMatch) {
      const alt = altImgMatch[1].trim();
      if (alt && !['logo', 'image', 'icon', 'banner', 'avatar'].includes(alt.toLowerCase()) && alt.length < 50) {
        organization = alt;
      }
    }

    const h1Matches = Array.from(html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim());
    if (!title && h1Matches.length > 0) {
      const firstH1 = h1Matches[0];
      if (firstH1 && !firstH1.toLowerCase().includes('hiretoday') && firstH1.length < 120) {
        if (!organization) {
          organization = firstH1;
        } else {
          title = firstH1;
        }
      }
    }

    // --- 3. JSON-LD SCHEMA.ORG PARSING ---
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonLdMatch;
    while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        const item = Array.isArray(data) ? data[0] : data;
        if (item) {
          if (!title && (item.title || item.name)) title = item.title || item.name;
          if (!organization && (item.hiringOrganization?.name || item.organizer?.name || item.author?.name)) {
            organization = item.hiringOrganization?.name || item.organizer?.name || item.author?.name;
          }
          if (!description && item.description) {
            description = item.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          if (!registrationUrl && (item.directApply || item.url || item.sameAs)) {
            registrationUrl = item.directApply || item.url || item.sameAs;
            isRegistrationDetected = true;
          }
          if (!location && item.jobLocation?.address?.addressLocality) {
            location = item.jobLocation.address.addressLocality;
          }
        }
      } catch {}
    }

    // --- 4. OPENGRAPH / META TAG FALLBACKS ---
    const getMetaTag = (property: string) => {
      const regex = new RegExp(`<meta\\s+(?:name|property)=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      if (match) return match[1];
      const revRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${property}["']`, 'i');
      const revMatch = html.match(revRegex);
      return revMatch ? revMatch[1] : null;
    };

    const ogTitle = getMetaTag('og:title') || getMetaTag('twitter:title') || getMetaTag('title');
    const ogDesc = getMetaTag('og:description') || getMetaTag('description') || getMetaTag('twitter:description');
    const ogSiteName = getMetaTag('og:site_name');

    if (!title) {
      if (ogTitle && !ogTitle.toLowerCase().includes('hiretoday')) title = ogTitle;
      else {
        const pageTitleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (pageTitleMatch && !pageTitleMatch[1].toLowerCase().includes('hiretoday')) {
          title = pageTitleMatch[1].trim();
        }
      }
    }

    if (title.includes('|')) title = title.split('|')[0].trim();
    if (title.includes(' - ') && title.length > 50) title = title.split(' - ')[0].trim();

    if (!organization) {
      if (ogSiteName && !ogSiteName.toLowerCase().includes('hiretoday')) organization = ogSiteName;
      else if (parsedUrl.hostname.includes('unstop')) organization = 'Unstop';
      else if (parsedUrl.hostname.includes('devfolio')) organization = 'Devfolio';
      else if (parsedUrl.hostname.includes('linkedin')) organization = 'LinkedIn';
      else if (parsedUrl.hostname.includes('internshala')) organization = 'Internshala';
      else {
        const parts = parsedUrl.hostname.replace('www.', '').split('.');
        organization = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }

    if (!description && ogDesc) {
      description = ogDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    if (!location) {
      const locMatch = html.match(/(?:Location|Workplace|City)[:\s]*<[^>]+>([^<]+)</i) ||
                       html.match(/([A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK|Canada|Germany|Remote|Online|Bengaluru|Hyderabad|Mumbai|Delhi|Pune))/);
      if (locMatch) {
        location = locMatch[1].trim();
      }
    }

    // --- 5. REGISTRATION LINK DETECTION ---
    if (!registrationUrl) {
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let linkMatch;
      const keywords = ['apply now', 'apply', 'register', 'registration', 'participate', 'join', 'careers'];
      while ((linkMatch = linkRegex.exec(html)) !== null) {
        const href = linkMatch[1];
        const text = linkMatch[2].replace(/<[^>]+>/g, '').toLowerCase().trim();
        if (keywords.some((k) => text.includes(k) || href.toLowerCase().includes('apply'))) {
          try {
            const absUrl = new URL(href, parsedUrl.href).href;
            if (absUrl.startsWith('http://') || absUrl.startsWith('https://')) {
              if (!absUrl.includes('login') && !absUrl.includes('signup') && absUrl !== parsedUrl.href) {
                registrationUrl = absUrl;
                isRegistrationDetected = true;
                break;
              }
            }
          } catch {}
        }
      }
    }

    if (!registrationUrl) {
      registrationUrl = parsedUrl.href;
    }

    // Mode & Location
    let mode = 'ONLINE';
    if (!location) location = 'Online';
    const lowerText = `${title} ${description} ${location}`.toLowerCase();
    if (lowerText.includes('hybrid')) {
      mode = 'HYBRID';
      if (location === 'Online') location = 'Hybrid';
    } else if (lowerText.includes('on-site') || lowerText.includes('onsite') || lowerText.includes('office')) {
      mode = 'OFFLINE';
      if (location === 'Online') location = 'On-site';
    } else {
      mode = 'ONLINE';
    }

    // Detect Opportunity Type
    let opportunityType = 'JOB';
    if (lowerText.includes('hackathon') || lowerText.includes('coding challenge') || lowerText.includes('ideathon')) {
      opportunityType = 'HACKATHON';
    } else if (lowerText.includes('intern') || lowerText.includes('internship') || lowerText.includes('trainee')) {
      opportunityType = 'INTERNSHIP';
    } else if (lowerText.includes('contest') || lowerText.includes('competition') || lowerText.includes('tournament')) {
      opportunityType = 'COMPETITION';
    } else if (lowerText.includes('scholarship') || lowerText.includes('grant') || lowerText.includes('fellowship')) {
      opportunityType = 'SCHOLARSHIP';
    } else if (lowerText.includes('workshop') || lowerText.includes('bootcamp') || lowerText.includes('webinar')) {
      opportunityType = 'WORKSHOP';
    } else if (lowerText.includes('job') || lowerText.includes('full time') || lowerText.includes('engineer') || lowerText.includes('developer')) {
      opportunityType = 'JOB';
    }

    // Extract Stipend or Salary if present
    const stipendMatch = html.match(/(?:Stipend|Salary|Package)[:\s]*<[^>]+>([^<]+)</i) ||
                         html.match(/(?:Stipend|Salary)[:\s]*([₹$0-9,\s\-kK]+(?:per month|\/mo|LPA|PA)?)/i);
    if (stipendMatch) {
      stipend = stipendMatch[1].trim();
    }

    const fetchedData = {
      title: title || 'Opportunity Details',
      organization: organization || 'Official Host',
      type: opportunityType,
      description: description ? description.substring(0, 1000) : '',
      opportunityUrl: parsedUrl.href,
      registrationUrl: registrationUrl,
      isRegistrationDetected,
      location,
      mode,
      stipend: stipend || '',
      salary: stipend || '',
      applicationDeadline: null,
      skills: [],
      eligibility: ''
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

