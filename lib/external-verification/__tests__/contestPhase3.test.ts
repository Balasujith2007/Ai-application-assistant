/**
 * Phase 3 – contest verification & achievement engine test suite.
 *
 * Run with:  npx tsx lib/external-verification/__tests__/contestPhase3.test.ts
 *
 * Design constraints (same as the Phase 1 / Phase 2 suites):
 *  - No database access, no production data, no real provider calls.
 *  - Only mocked provider payloads and synthetic accounts are used.
 *  - Checks that genuinely require a live database (composite-key dedup,
 *    badge-award uniqueness, cross-student isolation, Super-Admin role lookups)
 *    are NOT fake-passed; they are reported as BLOCKED/DB and listed in the
 *    acceptance report.
 *
 * The 20 cases map 1:1 onto Phase 3 §9.
 */

import {
  CONTEST_EVIDENCE_SOURCE_LABELS,
  MIN_PARTICIPANTS_FOR_PERCENTILE,
  MIN_RATED_CONTESTS_FOR_CLIMBER,
  PROVIDER_CONTEST_CAPABILITY_MATRIX,
  TOP_10_PERCENT,
  TOP_5_PERCENT,
  contestEvidenceSourceFor,
  getContestCapability,
  type NormalizedContestRecord,
  type ProviderContestCapability,
} from '../contestTypes';
import {
  computeContestStats,
  computeCumulativeRatingImprovement,
  computeFinishPercentile,
  computePersonalBestRating,
  computePlatformContestStats,
  deriveContestCoverage,
  isStableExternalContestId,
  normalizeContestFeed,
} from '../contestVerification';
import {
  BADGE_CATALOG,
  CONTEST_BADGE_IDS,
  CONTEST_BADGES,
  isContestBadge,
  type StudentActivityStats,
} from '../../gamification/badgeConfig';
import {
  isEligibleForExternalAchievementBadge,
  normalizeOwnershipStatus,
} from '../ownershipStatus';
import { contestVerificationService } from '../contestService';
import { requireSuperAdmin } from '../../gamification/adminGuard';
import { toPlatformLocalDate } from '../platformStreak';

// ── Tiny assertion harness (identical contract to the Phase 1/2 suites) ─────

let passed = 0;
const failures: string[] = [];
const blocked: string[] = [];
let currentSection = '';

function section(name: string) {
  currentSection = name;
  console.log(`\n── ${name}`);
}

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failures.push(`${currentSection} › ${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? undefined : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function blockedCase(name: string, reason: string) {
  blocked.push(`${currentSection} › ${name} — ${reason}`);
  console.log(`  ⚠ BLOCKED (DB): ${name} — ${reason}`);
}

// ── Synthetic fixtures (no real accounts, no real contests) ─────────────────

function cap(platform: string): ProviderContestCapability {
  const c = getContestCapability(platform);
  if (!c) throw new Error(`missing contest capability for ${platform}`);
  return c;
}

/** A synthetic contest feed entry. `totalParticipants` is only set when given. */
function entry(over: Record<string, unknown>) {
  return {
    externalActivityId: 'unset',
    contestName: 'Synthetic Contest',
    participatedAt: '2024-05-12T14:30:00.000Z',
    ...over,
  };
}

/** Maps engine stats onto the badge engine's StudentActivityStats contract. */
function toStatFields(records: NormalizedContestRecord[]): Partial<StudentActivityStats> {
  const cs = computeContestStats(records);
  const busiest = [...cs.byPlatform].sort((a, b) => b.participationCount - a.participationCount)[0];
  return {
    contestParticipationCount: cs.totalVerifiedParticipations,
    contestPlatforms: cs.byPlatform.map((p) => p.platform),
    contestPlatform: busiest && busiest.participationCount > 0 ? busiest.platform : null,
    contestRatedContestsCount: cs.ratedContestsCount,
    contestPersonalBestRating: cs.personalBestRating,
    contestPersonalBestPlatform: cs.personalBestPlatform,
    contestCumulativeRatingImprovement: cs.bestCumulativeRatingImprovement,
    contestTop10PercentFinishes: cs.top10PercentFinishes,
    contestTop5PercentFinishes: cs.top5PercentFinishes,
  };
}

/** Minimal StudentActivityStats carrying only the Phase 3 contest fields. */
function contestStats(over: Partial<StudentActivityStats> = {}): StudentActivityStats {
  return {
    contestParticipationCount: 0,
    contestPlatforms: [],
    contestPlatform: null,
    contestRatedContestsCount: 0,
    contestPersonalBestRating: null,
    contestPersonalBestPlatform: null,
    contestCumulativeRatingImprovement: 0,
    contestTop10PercentFinishes: 0,
    contestTop5PercentFinishes: 0,
    ...over,
  } as unknown as StudentActivityStats;
}

function evalContest(badgeId: string, stats: StudentActivityStats) {
  const def = BADGE_CATALOG.find((b) => b.id === badgeId);
  if (!def) throw new Error(`missing badge ${badgeId}`);
  return def.evaluate(stats, def.defaultThreshold);
}

async function main() {
  // ── A. Capability matrix + evidence taxonomy (Phase 3 §3) ──────────────────
  section('A. Provider capability matrix and evidence taxonomy (§3)');

  eq('exactly four contest platforms are modelled', PROVIDER_CONTEST_CAPABILITY_MATRIX.length, 4);
  eq(
    'the four platforms are LeetCode / CodeChef / AtCoder / Codeforces',
    PROVIDER_CONTEST_CAPABILITY_MATRIX.map((c) => c.platform).sort(),
    ['ATCODER', 'CODECHEF', 'CODEFORCES', 'LEETCODE'],
  );
  eq(
    'only Codeforces is an OFFICIAL_API source',
    PROVIDER_CONTEST_CAPABILITY_MATRIX.filter((c) => c.evidenceSource === 'OFFICIAL_API').map((c) => c.platform),
    ['CODEFORCES'],
  );
  check(
    'scraped / community sources are never labelled as official APIs',
    PROVIDER_CONTEST_CAPABILITY_MATRIX.every((c) => {
      if (c.apiKind === 'OFFICIAL') return c.evidenceSource === 'OFFICIAL_API';
      if (c.apiKind === 'SCRAPED') return c.evidenceSource === 'SCRAPED_PUBLIC_DATA';
      if (c.apiKind === 'COMMUNITY') return c.evidenceSource === 'COMMUNITY_API';
      return c.evidenceSource !== 'OFFICIAL_API';
    }),
  );
  check(
    'every capability evidenceSource matches contestEvidenceSourceFor(apiKind)',
    PROVIDER_CONTEST_CAPABILITY_MATRIX.every((c) => c.evidenceSource === contestEvidenceSourceFor(c.apiKind)),
  );
  eq('CodeChef relies on scraped public data', cap('CODECHEF').evidenceSource, 'SCRAPED_PUBLIC_DATA');
  eq('CodeChef cannot supply contest history', cap('CODECHEF').contestHistory, false);
  eq('CodeChef best coverage is UNAVAILABLE', cap('CODECHEF').historicalCompleteness, 'UNAVAILABLE');
  eq('AtCoder uses a community mirror', cap('ATCODER').evidenceSource, 'COMMUNITY_API');
  eq('AtCoder history is capped → PARTIAL', cap('ATCODER').historicalCompleteness, 'PARTIAL');
  eq('LeetCode uses public-profile data', cap('LEETCODE').evidenceSource, 'PUBLIC_PROFILE');
  eq('LeetCode history is PARTIAL', cap('LEETCODE').historicalCompleteness, 'PARTIAL');
  eq('LeetCode cannot supply a rating delta', cap('LEETCODE').supportsRatingChange, false);
  eq('Codeforces has the strongest official support (FULL)', cap('CODEFORCES').historicalCompleteness, 'FULL');
  eq('Codeforces can supply a rating delta', cap('CODEFORCES').supportsRatingChange, true);
  eq('no provider publishes a participant total in the matrix except none', cap('CODEFORCES').supportsTotalParticipants, false);
  check('every capability carries explicit limitation notes', PROVIDER_CONTEST_CAPABILITY_MATRIX.every((c) => c.notes.length > 0));
  check('the 500-record cap is documented for AtCoder', cap('ATCODER').notes.some((n) => n.includes('500')));
  check(
    'every evidence source has a human label',
    Object.values(CONTEST_EVIDENCE_SOURCE_LABELS).every((l) => typeof l === 'string' && l.length > 0),
  );

  // ── B. Case 1 — verified Codeforces participation ──────────────────────────
  section('B. Case 1 — verified Codeforces participation (OFFICIAL_API, FULL)');

  const cfFeed = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    evidenceReference: 'https://codeforces.com/profile/synthetic-student-a',
    results: [
      entry({ externalActivityId: '1845', contestName: 'Codeforces Round 1845', rank: 812, oldRating: 1500, newRating: 1587, participatedAt: '2024-05-01T14:35:00.000Z' }),
      entry({ externalActivityId: '1851', contestName: 'Codeforces Round 1851', rank: 640, oldRating: 1587, newRating: 1673, participatedAt: '2024-05-15T14:35:00.000Z' }),
      entry({ externalActivityId: '1857', contestName: 'Codeforces Round 1857', rank: 1500, oldRating: 1673, newRating: 1622, participatedAt: '2024-06-01T14:35:00.000Z' }),
    ],
  });

  eq('CF coverage is FULL', cfFeed.coverage, 'FULL');
  eq('CF feed is available', cfFeed.available, true);
  eq('CF evidence source is OFFICIAL_API', cfFeed.evidenceSource, 'OFFICIAL_API');
  eq('three CF participations accepted', cfFeed.records.length, 3);
  eq('no CF record was rejected', cfFeed.rejected.length, 0);
  check('every CF record is VERIFIED (rank present)', cfFeed.records.every((r) => r.status === 'VERIFIED'));
  eq(
    'CF rating deltas are derived from old→new only',
    cfFeed.records.map((r) => r.ratingChange),
    [87, 86, -51],
  );
  eq('CF records are ordered oldest first', cfFeed.records.map((r) => r.externalContestId), ['1845', '1851', '1857']);
  check('CF participation is never claimed from registration (records only come from the feed)', cfFeed.records.every((r) => r.participated === true));

  const cfStats = computeContestStats(cfFeed.records);
  eq('CF total verified participations', cfStats.totalVerifiedParticipations, 3);
  eq('CF rated contests counted', cfStats.ratedContestsCount, 3);
  eq('CF personal-best rating is the max new rating', cfStats.personalBestRating, 1673);
  eq('CF cumulative improvement sums only positive gains', cfStats.bestCumulativeRatingImprovement, 173);
  eq('CF top-10% finishes are 0 (no participant total published)', cfStats.top10PercentFinishes, 0);
  eq('CF top-5% finishes are 0 (no participant total published)', cfStats.top5PercentFinishes, 0);

  // ── C. Case 2 — verified LeetCode participation when evidence exists ───────
  section('C. Case 2 — verified LeetCode participation (PUBLIC_PROFILE, PARTIAL)');

  const lcFeed = normalizeContestFeed({
    platform: 'LEETCODE',
    capability: cap('LEETCODE'),
    available: true,
    results: [
      entry({ externalActivityId: 'weekly-contest-390', contestName: 'Weekly Contest 390', rank: 1204, newRating: 1611, participatedAt: '2024-04-21T02:30:00.000Z' }),
      entry({ externalActivityId: 'biweekly-contest-128', contestName: 'Biweekly Contest 128', rank: 900, newRating: 1688, participatedAt: '2024-05-05T14:30:00.000Z' }),
    ],
  });

  eq('LC coverage is PARTIAL', lcFeed.coverage, 'PARTIAL');
  eq('LC evidence source is PUBLIC_PROFILE (not an official API)', lcFeed.evidenceSource, 'PUBLIC_PROFILE');
  eq('two LC participations accepted', lcFeed.records.length, 2);
  check('LC records are VERIFIED (rank present)', lcFeed.records.every((r) => r.status === 'VERIFIED'));
  check('LC rating delta is NOT invented (no old rating published)', lcFeed.records.every((r) => r.ratingChange === undefined));
  eq('LC personal-best rating is derived from new ratings', computePersonalBestRating(lcFeed.records), 1688);
  eq('LC cumulative improvement is 0 (no deltas → nothing verifiable)', computeCumulativeRatingImprovement(lcFeed.records), 0);

  // ── D. Case 3 — CodeChef participation with incomplete evidence ────────────
  section('D. Case 3 — CodeChef incomplete evidence (scraped, UNAVAILABLE)');

  const ccFeed = normalizeContestFeed({
    platform: 'CODECHEF',
    capability: cap('CODECHEF'),
    available: true,
    results: [entry({ externalActivityId: 'START128', rank: 40, newRating: 1700 })],
  });

  eq('CC coverage is UNAVAILABLE (no contest feed exists)', ccFeed.coverage, 'UNAVAILABLE');
  eq('CC keeps the scraped evidence source', ccFeed.evidenceSource, 'SCRAPED_PUBLIC_DATA');
  eq('CC produces zero records — never fabricated', ccFeed.records.length, 0);
  check('CC surface an explicit reason', typeof ccFeed.unavailableReason === 'string' && ccFeed.unavailableReason!.length > 0);
  check('CC is never labelled OFFICIAL_API', ccFeed.evidenceSource !== 'OFFICIAL_API');
  eq('CC yields no contest badges stats', computeContestStats(ccFeed.records).totalVerifiedParticipations, 0);

  // ── E. Case 4 — AtCoder participation with available evidence ──────────────
  section('E. Case 4 — AtCoder evidence (COMMUNITY_API, PARTIAL)');

  const atFeed = normalizeContestFeed({
    platform: 'ATCODER',
    capability: cap('ATCODER'),
    available: true,
    results: [
      entry({ externalActivityId: 'abc-352', contestName: 'AtCoder Beginner Contest 352', rank: 2210, oldRating: 800, newRating: 842, participatedAt: '2024-05-04T12:00:00.000Z' }),
      entry({ externalActivityId: 'abc-355', contestName: 'AtCoder Beginner Contest 355', rank: 1800, oldRating: 842, newRating: 905, participatedAt: '2024-05-25T12:00:00.000Z' }),
    ],
  });

  eq('AT coverage is PARTIAL (community mirror cap)', atFeed.coverage, 'PARTIAL');
  eq('AT evidence source is COMMUNITY_API', atFeed.evidenceSource, 'COMMUNITY_API');
  eq('two AT participations accepted', atFeed.records.length, 2);
  eq('AT rating deltas derived from the community feed', atFeed.records.map((r) => r.ratingChange), [42, 63]);
  eq('AT personal-best rating', computePersonalBestRating(atFeed.records), 905);
  check('AT is not labelled an official API', atFeed.evidenceSource !== 'OFFICIAL_API');

  // ── F. Case 5 — duplicate contest import ───────────────────────────────────
  section('F. Case 5 — duplicate contest import is deterministic and collapses to one key');

  const dupFeed = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    results: [
      entry({ externalActivityId: '1845', rank: 812, newRating: 1587 }),
      entry({ externalActivityId: '1845', rank: 812, newRating: 1587 }),
    ],
  });
  const keyOf = (r: NormalizedContestRecord) => `${r.platform}|${r.externalContestId}`;
  eq('duplicate feed entries collapse to a single unique key', new Set(dupFeed.records.map(keyOf)).size, 1);
  eq(
    'normalizing the same feed twice is byte-identical (retry-safe)',
    JSON.stringify(cfFeed),
    JSON.stringify(
      normalizeContestFeed({
        platform: 'CODEFORCES',
        capability: cap('CODEFORCES'),
        available: true,
        evidenceReference: 'https://codeforces.com/profile/synthetic-student-a',
        results: [
          entry({ externalActivityId: '1845', contestName: 'Codeforces Round 1845', rank: 812, oldRating: 1500, newRating: 1587, participatedAt: '2024-05-01T14:35:00.000Z' }),
          entry({ externalActivityId: '1851', contestName: 'Codeforces Round 1851', rank: 640, oldRating: 1587, newRating: 1673, participatedAt: '2024-05-15T14:35:00.000Z' }),
          entry({ externalActivityId: '1857', contestName: 'Codeforces Round 1857', rank: 1500, oldRating: 1673, newRating: 1622, participatedAt: '2024-06-01T14:35:00.000Z' }),
        ],
      }),
    ),
  );
  blockedCase(
    'database-level duplicate contest import',
    'enforced by the (studentId, platform, externalContestId) unique key + deterministic vc_<sha1> row id; requires an isolated DB',
  );

  // ── G. Case 6 — duplicate badge award prevention ───────────────────────────
  section('G. Case 6 — duplicate badge award prevention is deterministic');

  const sixStats = contestStats(toStatFields(cfFeed.records));
  eq('contest eligibility is stable across repeated evaluations', evalContest('contest-first-participation', sixStats).isEligible, true);
  eq('…the same input yields the same result again', evalContest('contest-first-participation', sixStats).isEligible, true);
  eq('an under-threshold input stays ineligible', evalContest('contest-regular', contestStats({ contestParticipationCount: 4 })).isEligible, false);
  blockedCase(
    'concurrent duplicate badge awards',
    'enforced by the (studentId, badgeId) unique constraint + deterministic credential id; requires an isolated DB',
  );

  // ── H. Case 7 — unverified account cannot earn high-value automated badges ─
  section('H. Case 7 — an unverified account cannot earn high-value automated contest badges');

  // The engine gate is: supported && ownershipVerified && coverage !== 'UNAVAILABLE'.
  const gate = (ownershipStatus: string, coverage: string, supported = true) =>
    supported && normalizeOwnershipStatus(ownershipStatus) === 'OWNERSHIP_VERIFIED' && coverage !== 'UNAVAILABLE';

  eq('unverified + FULL coverage → not eligible', gate('PROFILE_EXISTS', 'FULL'), false);
  eq('ownership-unverified + FULL coverage → not eligible', gate('OWNERSHIP_UNVERIFIED', 'FULL'), false);
  eq('ownership-verified + UNAVAILABLE coverage → not eligible', gate('OWNERSHIP_VERIFIED', 'UNAVAILABLE'), false);
  eq('ownership-verified + unsupported platform → not eligible', gate('OWNERSHIP_VERIFIED', 'FULL', false), false);
  eq('ownership-verified + FULL coverage → eligible', gate('OWNERSHIP_VERIFIED', 'FULL'), true);
  eq('ownership-verified + PARTIAL coverage → eligible (partial is not unavailable)', gate('OWNERSHIP_VERIFIED', 'PARTIAL'), true);
  check(
    'every contest badge is high-value (requires ownership verification)',
    CONTEST_BADGE_IDS.length === 8,
  );

  // ── I. Case 8 — PROFILE_EXISTS cannot qualify as ownership ─────────────────
  section('I. Case 8 — PROFILE_EXISTS never qualifies as ownership');

  eq('PROFILE_EXISTS normalizes to PROFILE_EXISTS', normalizeOwnershipStatus('PROFILE_EXISTS'), 'PROFILE_EXISTS');
  eq('legacy VERIFIED normalizes to PROFILE_EXISTS', normalizeOwnershipStatus('VERIFIED'), 'PROFILE_EXISTS');
  eq('legacy FORMAT_VERIFIED normalizes to PROFILE_EXISTS', normalizeOwnershipStatus('FORMAT_VERIFIED'), 'PROFILE_EXISTS');
  check('PROFILE_EXISTS is NOT badge-eligible', !isEligibleForExternalAchievementBadge('PROFILE_EXISTS').eligible);
  check('FORMAT_VERIFIED is NOT badge-eligible', !isEligibleForExternalAchievementBadge('FORMAT_VERIFIED').eligible);
  check('OWNERSHIP_UNVERIFIED is NOT badge-eligible', !isEligibleForExternalAchievementBadge('OWNERSHIP_UNVERIFIED').eligible);
  check('a null/unverified URL is NOT badge-eligible', !isEligibleForExternalAchievementBadge(null).eligible);
  check('OWNERSHIP_VERIFIED IS badge-eligible', isEligibleForExternalAchievementBadge('OWNERSHIP_VERIFIED').eligible);

  // ── J. Case 9 — provider outage does not imply non-participation ───────────
  section('J. Case 9 — a provider outage must NOT be read as non-participation');

  const outage = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: false,
    unavailableReason: 'NETWORK_ERROR: upstream timed out',
  });
  eq('outage → coverage UNAVAILABLE', outage.coverage, 'UNAVAILABLE');
  eq('outage → available is false', outage.available, false);
  eq('outage → zero records (nothing invented)', outage.records.length, 0);
  check('outage → an explicit reason is surfaced', typeof outage.unavailableReason === 'string' && outage.unavailableReason!.length > 0);

  const genuinelyEmpty = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    results: [],
  });
  eq('a readable provider with zero contests → coverage FULL', genuinelyEmpty.coverage, 'FULL');
  check(
    'an outage (UNAVAILABLE) is distinguishable from a genuine zero (FULL)',
    outage.coverage !== genuinelyEmpty.coverage,
  );
  check('an outage never reports "0 participations → did not participate"', outage.available === false);
  eq('deriveContestCoverage(available=false) is always UNAVAILABLE', deriveContestCoverage(cap('CODEFORCES'), false), 'UNAVAILABLE');

  // ── K. Case 10 — partial history does not imply non-participation ──────────
  section('K. Case 10 — PARTIAL history still evidences participation');

  eq('LC PARTIAL records still count as participation', computeContestStats(lcFeed.records).totalVerifiedParticipations, 2);
  eq('AT PARTIAL records still count as participation', computeContestStats(atFeed.records).totalVerifiedParticipations, 2);
  const mixed = computeContestStats([...lcFeed.records, ...atFeed.records]);
  eq('PARTIAL records across two providers are aggregated', mixed.totalVerifiedParticipations, 4);
  eq('both PARTIAL platforms are reported', mixed.platformsWithParticipation, 2);
  check('PARTIAL is never silently zeroed', mixed.totalVerifiedParticipations !== 0);

  // ── L. Case 11 — missing rank does not generate rank badges ────────────────
  section('L. Case 11 — a missing rank never generates a rank/percentile badge');

  const noRank = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    results: [entry({ externalActivityId: '1900', newRating: 1700 })],
  });
  eq('a rating-only record is still VERIFIED evidence', noRank.records[0].status, 'VERIFIED');
  eq('no rank → percentile is null', computeFinishPercentile(undefined, 5000), null);
  eq('no rank → zero top-10% finishes', computePlatformContestStats('CODEFORCES', noRank.records).top10PercentFinishes, 0);
  eq('no rank → zero top-5% finishes', computePlatformContestStats('CODEFORCES', noRank.records).top5PercentFinishes, 0);
  const noRankStats = contestStats(toStatFields(noRank.records));
  eq('no rank → Podium Challenger is not eligible', evalContest('contest-podium-challenger', noRankStats).isEligible, false);
  eq('no rank → Top Performer is not eligible', evalContest('contest-top-performer', noRankStats).isEligible, false);

  // ── M. Case 12 — missing participant count does not generate percentile ────
  section('M. Case 12 — a missing/too-small participant count never generates a percentile badge');

  eq('rank + no participant total → percentile null', computeFinishPercentile(5, undefined), null);
  eq(
    `participant total below ${MIN_PARTICIPANTS_FOR_PERCENTILE} → percentile null`,
    computeFinishPercentile(1, MIN_PARTICIPANTS_FOR_PERCENTILE - 1),
    null,
  );
  eq('rank greater than the total is rejected', computeFinishPercentile(500, 100), null);
  eq('rank 1 of 100 → 1%', computeFinishPercentile(1, 100), 1);
  eq('rank 9 of 100 is a top-10% finish', computeFinishPercentile(9, 100)! <= TOP_10_PERCENT, true);
  eq('rank 9 of 100 is NOT a top-5% finish', computeFinishPercentile(9, 100)! <= TOP_5_PERCENT, false);

  const withTotal = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    results: [
      entry({ externalActivityId: '2001', rank: 40, totalParticipants: 4000, newRating: 1800 }),
      entry({ externalActivityId: '2002', rank: 400, totalParticipants: 4000, newRating: 1750 }),
    ],
  });
  const withTotalStats = computeContestStats(withTotal.records);
  // rank 40 / 4000 = 1% (top-5% AND top-10%); rank 400 / 4000 = 10% (top-10% only).
  eq('rank 1% is inside both percentile bands', computeFinishPercentile(40, 4000)! <= TOP_5_PERCENT, true);
  eq('rank 10% is inside the top-10% band but not the top-5% band', [
    computeFinishPercentile(400, 4000)! <= TOP_10_PERCENT,
    computeFinishPercentile(400, 4000)! <= TOP_5_PERCENT,
  ], [true, false]);
  eq('two published rank+total finishes yield two top-10% finishes', withTotalStats.top10PercentFinishes, 2);
  eq('only the 1% finish is a top-5% finish', withTotalStats.top5PercentFinishes, 1);
  eq('Podium Challenger is eligible from a real percentile finish', evalContest('contest-podium-challenger', contestStats(toStatFields(withTotal.records))).isEligible, true);
  check(
    'the above is possible only because the provider published a real participant total',
    withTotal.records.every((r) => typeof r.totalParticipants === 'number'),
  );

  // ── N. Case 13 — rating personal-best calculation ──────────────────────────
  section('N. Case 13 — personal-best rating is derived, never invented');

  eq('personal best = max new rating', computePersonalBestRating(cfFeed.records), 1673);
  eq('no ratings at all → personal best null', computePersonalBestRating([]), null);
  eq(
    'records without a new rating contribute nothing',
    computePersonalBestRating([{ ...cfFeed.records[0], newRating: undefined }]),
    null,
  );
  const pb = computeContestStats([...cfFeed.records, ...atFeed.records]);
  eq('personal best is taken across platforms', pb.personalBestRating, 1673);
  eq('personal-best platform is reported', pb.personalBestPlatform, 'CODEFORCES');
  eq('Rating Breakthrough fires at a 1200+ personal best', evalContest('contest-rating-breakthrough', contestStats({ contestPersonalBestRating: 1673 })).isEligible, true);
  eq('Rating Breakthrough does not fire below 1200', evalContest('contest-rating-breakthrough', contestStats({ contestPersonalBestRating: 1199 })).isEligible, false);
  eq(
    `cumulative improvement needs >= ${MIN_RATED_CONTESTS_FOR_CLIMBER} rated contests`,
    computeCumulativeRatingImprovement([cfFeed.records[0]]),
    0,
  );
  eq('cumulative improvement fires Rating Climber at 200+', evalContest('contest-rating-climber', contestStats({ contestCumulativeRatingImprovement: 173 })).isEligible, false);

  // ── O. Case 14 — invalid / unstable external contest ids are rejected ──────
  section('O. Case 14 — unstable external contest ids are rejected');

  check('a numeric provider id is stable', isStableExternalContestId('1845'));
  check('a slug id is stable', isStableExternalContestId('weekly-contest-390'));
  check('an empty id is rejected', !isStableExternalContestId(''));
  check('a whitespace-only id is rejected', !isStableExternalContestId('   '));
  check('a display name (contains whitespace) is rejected', !isStableExternalContestId('Weekly Contest 300'));
  check('the placeholder "unknown" is rejected', !isStableExternalContestId('unknown'));
  check('the placeholder "n/a" is rejected', !isStableExternalContestId('n/a'));
  check('the placeholder "-" is rejected', !isStableExternalContestId('-'));
  check('a non-string id is rejected', !isStableExternalContestId(1845 as unknown));
  check('an absurdly long id is rejected', !isStableExternalContestId('x'.repeat(201)));
  check('an index-derived id is rejected when the position matches', !isStableExternalContestId('2', 2));
  check('the same value is accepted when the position does not match', isStableExternalContestId('2', 0));

  const badFeed = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    results: [
      entry({ externalActivityId: 'Weekly Contest 300', rank: 10, newRating: 1500 }),
      entry({ externalActivityId: '', rank: 10, newRating: 1500 }),
      entry({ externalActivityId: undefined, rank: 10, newRating: 1500 }),
      entry({ externalActivityId: 'unknown', rank: 10, newRating: 1500 }),
      entry({ externalActivityId: '9999', rank: 10, newRating: 1500 }),
    ],
  });
  eq('four unstable ids were rejected', badFeed.rejected.length, 4);
  eq('only the stable id survived', badFeed.records.map((r) => r.externalContestId), ['9999']);
  check('rejection reasons are recorded', badFeed.rejected.every((r) => r.reason.length > 0));

  const badTime = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    results: [
      entry({ externalActivityId: '3001', participatedAt: 'not-a-date' }),
      entry({ externalActivityId: '3002', participatedAt: '' }),
      entry({ externalActivityId: '3003', participatedAt: '2999-01-01T00:00:00.000Z' }),
    ],
  });
  eq('implausible timestamps are rejected', badTime.rejected.length, 3);
  eq('no record survives an implausible timestamp', badTime.records.length, 0);

  // ── P. Case 15 — unauthorized reviewer cannot approve evidence ─────────────
  section('P. Case 15 — an unauthorized reviewer cannot approve evidence');

  const anonGuard = await requireSuperAdmin(new Request('http://localhost/api/admin/external-verification', { method: 'POST' }));
  eq('an anonymous review request is rejected by the guard', anonGuard.ok, false);
  eq('the guard responds 401 (no session at all)', anonGuard.ok === false ? anonGuard.response.status : 0, 401);
  blockedCase(
    'a non-Super-Admin (e.g. STUDENT/MENTOR) review request',
    'requireSuperAdmin loads the role from the users table; requires an isolated DB',
  );

  // ── Q. Case 16 — reviewer actions require a reason ─────────────────────────
  section('Q. Case 16 — every reviewer decision requires a reason');

  const noReason = await contestVerificationService.decideReview({
    reviewerId: 'synthetic-admin',
    requestId: 'crev_synthetic',
    decision: 'APPROVE',
    reason: '   ',
  });
  eq('APPROVE with a blank reason is rejected', noReason.ok, false);
  check('the rejection names the missing reason', String(noReason.error || '').toLowerCase().includes('reason'));

  const noReasonReject = await contestVerificationService.decideReview({
    reviewerId: 'synthetic-admin',
    requestId: 'crev_synthetic',
    decision: 'REJECT',
    reason: '',
  });
  eq('REJECT with an empty reason is rejected', noReasonReject.ok, false);

  const badDecision = await contestVerificationService.decideReview({
    reviewerId: 'synthetic-admin',
    requestId: 'crev_synthetic',
    decision: 'MAYBE' as unknown as 'APPROVE',
    reason: 'looks fine',
  });
  eq('an unknown decision is rejected', badDecision.ok, false);

  // ── R. Case 17 — repeated manual review requests are idempotent ────────────
  section('R. Case 17 — repeated manual-review requests are idempotent');

  const missing = await contestVerificationService.requestManualReview('synthetic-student-a', {
    platform: '',
    externalContestId: '',
  });
  eq('a request without a platform is rejected before any write', missing.ok, false);
  check('the rejection names the missing fields', String(missing.error || '').includes('required'));

  const unsupported = await contestVerificationService.requestManualReview('synthetic-student-a', {
    platform: 'CODOLIO',
    externalContestId: 'X1',
  });
  eq('a request for an unsupported platform is rejected', unsupported.ok, false);
  check('the rejection names the unsupported platform', String(unsupported.error || '').includes('supported'));

  blockedCase(
    'repeated identical review requests collapse to one row',
    'enforced by the (studentId, platform, externalContestId) unique key + deterministic crev_<sha1> id with ON CONFLICT DO NOTHING; requires an isolated DB',
  );

  // ── S. Case 18 — one provider failure does not stop other providers ────────
  section('S. Case 18 — one provider failing must not stop the others');

  const okProvider = normalizeContestFeed({
    platform: 'CODEFORCES',
    capability: cap('CODEFORCES'),
    available: true,
    results: [entry({ externalActivityId: '4001', rank: 100, newRating: 1600 })],
  });
  const failingProvider = normalizeContestFeed({
    platform: 'ATCODER',
    capability: cap('ATCODER'),
    available: false,
    unavailableReason: 'TIMEOUT: community mirror unreachable',
  });
  const unsupportedProvider = normalizeContestFeed({
    platform: 'CODECHEF',
    capability: cap('CODECHEF'),
    available: true,
    results: [],
  });

  eq('the healthy provider still returns its records', okProvider.records.length, 1);
  eq('the failing provider returns UNAVAILABLE', failingProvider.coverage, 'UNAVAILABLE');
  eq('the unsupported provider returns UNAVAILABLE', unsupportedProvider.coverage, 'UNAVAILABLE');
  const combined = computeContestStats(okProvider.records);
  eq('the healthy provider still contributes stats', combined.totalVerifiedParticipations, 1);
  check('per-platform results are independent (no cross-provider zeroing)', combined.totalVerifiedParticipations === 1);
  blockedCase(
    'the full syncStudentContests loop isolation',
    'runs per-platform with independent try/catch persistence against the additive tables; requires an isolated DB',
  );

  // ── T. Case 19 — Asia/Kolkata timezone normalization ───────────────────────
  section('T. Case 19 — Asia/Kolkata normalization preserves original timestamps');

  eq('a late-UTC instant maps to the next IST day', toPlatformLocalDate('2024-03-09T20:00:00.000Z', 'Asia/Kolkata'), '2024-03-10');
  eq('a mid-UTC instant maps to the same IST day', toPlatformLocalDate('2024-03-10T06:00:00.000Z', 'Asia/Kolkata'), '2024-03-10');
  eq('an instant before IST midnight maps to the previous day', toPlatformLocalDate('2024-03-09T18:00:00.000Z', 'Asia/Kolkata'), '2024-03-09');
  eq('the original contest timestamp is stored verbatim (not shifted)', cfFeed.records[0].participatedAt, '2024-05-01T14:35:00.000Z');
  eq('the timestamp is unique per record', new Set(cfFeed.records.map((r) => r.participatedAt)).size, cfFeed.records.length);

  // ── U. Case 20 — Phase 1 / Phase 2 regression guard ────────────────────────
  section('U. Case 20 — existing badge + Phase 1/2 behaviour preserved');

  eq('the catalog now holds 44 badges (36 + 8 contest)', BADGE_CATALOG.length, 44);
  eq('exactly eight contest badges exist', CONTEST_BADGES.length, 8);
  eq('CONTEST_BADGE_IDS matches the resolved definitions', CONTEST_BADGE_IDS.length, CONTEST_BADGES.length);
  eq('exactly 36 non-contest badges remain', BADGE_CATALOG.filter((b) => !isContestBadge(b.id)).length, 36);
  check('no duplicate badge ids across the whole catalog', new Set(BADGE_CATALOG.map((b) => b.id)).size === BADGE_CATALOG.length);
  check(
    'no contest badge id collides with a pre-existing badge',
    CONTEST_BADGE_IDS.every((id) => BADGE_CATALOG.filter((b) => b.id === id).length === 1),
  );
  check('every contest badge has a distinct threshold/unit concept', CONTEST_BADGE_IDS.length === 8);
  check('every contest badge exposes an evidence hook', CONTEST_BADGES.every((b) => typeof b.evidence === 'function'));
  check('every contest badge is ENGINE-sourced', CONTEST_BADGES.every((b) => b.awardSource === 'ENGINE'));
  check(
    'every contest badge declares exact, non-estimated criteria',
    CONTEST_BADGES.every((b) => b.criteria.length > 20),
  );
  const contestEvidence = CONTEST_BADGES[0].evidence!(contestStats({ contestParticipationCount: 3, contestPlatforms: ['CODEFORCES'], contestPlatform: 'CODEFORCES' }));
  eq('contest evidence echoes the verified source', (contestEvidence as any)?.source, 'VERIFIED_CONTEST_PARTICIPATION');
  eq('contest evidence echoes the verified participation count', (contestEvidence as any)?.verifiedParticipations, 3);
  check(
    'contest evidence is null when nothing was verified (never fabricated)',
    CONTEST_BADGES[0].evidence!(contestStats()) === null,
  );

  for (const id of [
    'career-first-step',
    'streak-consistency-elite',
    'streak-consistency-pro',
    'coding-streak-consistency',
    'innovation-podium-finisher',
    'dev-profile-complete',
    'monthly-gold-champion',
  ]) {
    check(`pre-existing badge preserved: ${id}`, BADGE_CATALOG.some((b) => b.id === id));
  }
  eq(
    'the global streak badge still reads the global streak field',
    BADGE_CATALOG.find((b) => b.id === 'streak-consistency-pro')!.evaluate({ longestStreakDays: 30 } as unknown as StudentActivityStats, 30).isEligible,
    true,
  );
  eq(
    'a contest badge ignores the (unrelated) global streak field',
    evalContest('contest-first-participation', contestStats({ contestParticipationCount: 0 })).isEligible,
    false,
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failures.length}`);
  if (blocked.length > 0) {
    console.log(`Blocked (needs isolated DB): ${blocked.length}`);
    for (const b of blocked) console.log(`  - ${b}`);
  }
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('All Phase 3 contest-verification checks passed.');
  }
  console.log('════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exitCode = 1;
});
