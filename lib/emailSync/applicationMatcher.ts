export interface MatchableApplication {
  id: string;
  companyName: string;
  position: string;
  createdAt: Date | string;
  appliedDate?: Date | string | null;
  status: string;
}

export interface MatchCandidate {
  application: MatchableApplication;
  score: number;
  reasons: string[];
}

export interface MatchResult {
  decision: "AUTO_MATCH" | "AMBIGUOUS_MULTI_MATCH" | "LOW_CONFIDENCE" | "NO_MATCH";
  matchedApplicationId?: string;
  matchedApplication?: MatchableApplication;
  confidence: number;
  candidates: MatchCandidate[];
}

/**
 * Normalize string for comparison (lowercase, alphanumeric only)
 */
function normalizeString(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Tokenize string into meaningful words (excluding stop words)
 */
function tokenize(str: string): string[] {
  const stopWords = new Set(["inc", "llc", "corp", "ltd", "co", "the", "and", "technologies", "tech", "solutions", "group", "labs", "systems", "services", "global"]);
  return (str || "")
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function tokenSimilarity(tokensA: string[], tokensB: string[]): number {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Match parsed email metadata against student's existing applications
 */
export function matchEmailToApplications(params: {
  detectedCompany: string | null;
  detectedRole: string | null;
  referenceToken: string | null;
  subject: string;
  bodySnippet: string;
  applications: MatchableApplication[];
}): MatchResult {
  const { detectedCompany, detectedRole, referenceToken, subject, bodySnippet, applications } = params;

  if (!applications || applications.length === 0) {
    return {
      decision: "NO_MATCH",
      confidence: 0,
      candidates: [],
    };
  }

  const candidates: MatchCandidate[] = [];
  const fullText = `${subject} ${bodySnippet}`.toLowerCase();

  for (const app of applications) {
    let score = 0;
    const reasons: string[] = [];

    const appCompNorm = normalizeString(app.companyName);
    const appRoleTokens = tokenize(app.position);
    const appCompTokens = tokenize(app.companyName);

    // 1. Reference Token Match
    if (referenceToken && (app.id.includes(referenceToken) || app.position.toLowerCase().includes(referenceToken.toLowerCase()))) {
      score += 0.95;
      reasons.push(`Matched reference token '${referenceToken}'`);
    }

    // 2. Company Name Match
    let companyMatched = false;
    if (detectedCompany) {
      const detCompNorm = normalizeString(detectedCompany);
      if (detCompNorm && appCompNorm && (detCompNorm.includes(appCompNorm) || appCompNorm.includes(detCompNorm))) {
        score += 0.60;
        companyMatched = true;
        reasons.push(`Company name match (${app.companyName} vs ${detectedCompany})`);
      } else {
        const sim = tokenSimilarity(appCompTokens, tokenize(detectedCompany));
        if (sim > 0.5) {
          score += 0.50 * sim;
          companyMatched = true;
          reasons.push(`Company token similarity (${Math.round(sim * 100)}%)`);
        }
      }
    }

    // Also check if application company name is in subject or snippet
    if (!companyMatched && app.companyName) {
      const compRegex = new RegExp(`\\b${app.companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (compRegex.test(fullText)) {
        score += 0.55;
        companyMatched = true;
        reasons.push(`Company name '${app.companyName}' found in email content`);
      }
    }

    // 3. Role Title Match
    if (detectedRole) {
      const sim = tokenSimilarity(appRoleTokens, tokenize(detectedRole));
      if (sim > 0.4) {
        score += 0.30 * sim;
        reasons.push(`Role title match (${app.position} vs ${detectedRole})`);
      }
    } else {
      // Check if position words appear in full text
      const matchingTokens = appRoleTokens.filter((t) => fullText.includes(t));
      if (matchingTokens.length > 0 && appRoleTokens.length > 0) {
        const tokenRatio = matchingTokens.length / appRoleTokens.length;
        score += 0.20 * tokenRatio;
        reasons.push(`Role keywords (${matchingTokens.join(", ")}) found in email`);
      }
    }

    // 4. Recency Boost
    if (app.createdAt) {
      const appDate = new Date(app.createdAt).getTime();
      const now = Date.now();
      const daysAgo = (now - appDate) / (1000 * 60 * 60 * 24);
      if (daysAgo <= 45) {
        score += 0.05; // Slightly boost fresh applications
      }
    }

    const finalScore = Math.min(1.0, Number(score.toFixed(2)));
    if (finalScore >= 0.35) {
      candidates.push({
        application: app,
        score: finalScore,
        reasons,
      });
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      decision: "NO_MATCH",
      confidence: 0,
      candidates: [],
    };
  }

  const topCandidate = candidates[0];
  const secondCandidate = candidates[1];

  // If top candidate has high score and is distinct from second candidate
  if (topCandidate.score >= 0.80) {
    if (!secondCandidate || (topCandidate.score - secondCandidate.score >= 0.25)) {
      return {
        decision: "AUTO_MATCH",
        matchedApplicationId: topCandidate.application.id,
        matchedApplication: topCandidate.application,
        confidence: topCandidate.score,
        candidates,
      };
    } else {
      // Ambiguous multiple matches
      return {
        decision: "AMBIGUOUS_MULTI_MATCH",
        confidence: topCandidate.score,
        candidates,
      };
    }
  }

  // Low confidence match
  return {
    decision: "LOW_CONFIDENCE",
    confidence: topCandidate.score,
    candidates,
  };
}
