/**
 * Phase 1 – Step 8: mocked-provider test suite.
 *
 * Run with:  npx tsx lib/external-verification/__tests__/providerFoundation.test.ts
 *
 * Design constraints:
 *  - No database access, no production data, no real provider calls. Every
 *    HTTP interaction is served by an in-process mock of global `fetch`.
 *  - Only synthetic handles are used; nothing here reads or writes a real
 *    student's rewards, badges or gamification state.
 *  - Checks that require a live database (student data isolation, Super Admin
 *    authorization, cross-student idempotency) are NOT fake-passed here; they
 *    are reported as BLOCKED in the acceptance report.
 */

import { atCoderAdapter } from '../../leaderboard/adapters/atcoderAdapter';
import { leetCodeAdapter } from '../../leaderboard/adapters/leetcodeAdapter';
import { codeChefAdapter } from '../../leaderboard/adapters/codechefAdapter';
import { clearProviderCache } from '../../leaderboard/adapters/baseProvider';
import { computePlatformStreaks } from '../platformStreak';
import { isPlausibleOccurrence, mapVerificationMethod } from '../activityImporter';
import { buildChallengeToken, fieldContainsToken, normalizeFieldValue } from '../ownershipService';
import { isEligibleForExternalAchievementBadge, normalizeOwnershipStatus } from '../ownershipStatus';

// ── Tiny assertion harness ───────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];
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

// ── fetch mock ───────────────────────────────────────────────────────────────

type MockOutcome =
  | { status: number; body: string }
  | 'abort' // AbortError → adapter must classify as TIMEOUT
  | 'network'; // generic network failure

let routeHandler: (url: string, init: any) => MockOutcome = () => ({ status: 500, body: '' });

function installFetch(handler: (url: string, init: any) => MockOutcome) {
  routeHandler = handler;
  (globalThis as any).fetch = async (url: string, init: any) => {
    const outcome = routeHandler(String(url), init);
    if (outcome === 'abort') {
      const err: any = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    }
    if (outcome === 'network') {
      throw new Error('simulated network failure');
    }
    return {
      status: outcome.status,
      ok: outcome.status >= 200 && outcome.status < 300,
      headers: { get: (_k: string) => null },
      text: async () => outcome.body,
    };
  };
}

function installExplodingFetch() {
  installFetch(() => {
    throw new Error('fetch must not be called for this case');
  });
}

const jsonBody = (obj: unknown) => ({ status: 200, body: JSON.stringify(obj) });

// ── Setup ────────────────────────────────────────────────────────────────────

process.env.OWNERSHIP_CHALLENGE_SECRET = 'test-secret-key-that-is-long-enough-1234567890';

async function main() {
  // ── A. Provider capability declarations ────────────────────────────────────
  section('A. Provider capability declarations (declared, not fabricated)');

  const lcCaps = leetCodeAdapter.getProviderCapabilities();
  eq('LeetCode ownership capability is PROFILE_CHALLENGE', lcCaps.ownership, 'PROFILE_CHALLENGE');
  eq('LeetCode apiKind is DOCUMENTED_UNOFFICIAL', lcCaps.apiKind, 'DOCUMENTED_UNOFFICIAL');
  eq('LeetCode dailyActivity is declared unsupported', lcCaps.dailyActivity, false);
  eq('LeetCode acceptedSubmissions is declared unsupported', lcCaps.acceptedSubmissions, false);
  eq('LeetCode submissionTimestamps is declared unsupported', lcCaps.submissionTimestamps, false);
  eq('LeetCode contestHistory supported', lcCaps.contestHistory, true);

  const ccCaps = codeChefAdapter.getProviderCapabilities();
  eq('CodeChef apiKind is SCRAPED', ccCaps.apiKind, 'SCRAPED');
  eq('CodeChef dataFreshness is CURRENT_ONLY', ccCaps.dataFreshness, 'CURRENT_ONLY');
  eq('CodeChef ownership is NONE', ccCaps.ownership, 'NONE');
  eq('CodeChef ratingHistory declared unsupported', ccCaps.ratingHistory, false);

  const acCaps = atCoderAdapter.getProviderCapabilities();
  eq('AtCoder apiKind is COMMUNITY (no official API)', acCaps.apiKind, 'COMMUNITY');
  eq('AtCoder dataFreshness is HISTORICAL', acCaps.dataFreshness, 'HISTORICAL');
  eq('AtCoder ownership is NONE (no public editable field)', acCaps.ownership, 'NONE');
  eq('AtCoder acceptedSubmissions supported', acCaps.acceptedSubmissions, true);
  eq('AtCoder submissionTimestamps supported', acCaps.submissionTimestamps, true);
  eq('AtCoder dailyActivity supported', acCaps.dailyActivity, true);

  // ── B. Username validation ─────────────────────────────────────────────────
  section('B. Username validation (valid and invalid)');

  check('LeetCode accepts a normal handle', leetCodeAdapter.isValidUsername('neo_matrix'));
  check('LeetCode rejects an empty handle', !leetCodeAdapter.isValidUsername(''));
  check('LeetCode rejects a handle with spaces', !leetCodeAdapter.isValidUsername('neo matrix'));
  check('CodeChef accepts a normal handle', codeChefAdapter.isValidUsername('code_chef_01'));
  check('CodeChef rejects a 1-char handle', !codeChefAdapter.isValidUsername('a'));
  check('AtCoder accepts a 3+ char handle', atCoderAdapter.isValidUsername('abc123'));
  check('AtCoder rejects a 2-char handle', !atCoderAdapter.isValidUsername('ab'));
  check('AtCoder rejects a handle with a dash', !atCoderAdapter.isValidUsername('ab-c'));

  installExplodingFetch();
  const lcInvalid = (await leetCodeAdapter.validateProfile('bad handle!')) as any;
  check('LeetCode invalid handle returns INVALID_USERNAME', lcInvalid.ok === false && lcInvalid.errorKind === 'INVALID_USERNAME');
  const acInvalid = (await atCoderAdapter.validateProfile('ab')) as any;
  check('AtCoder invalid handle returns INVALID_USERNAME without network', acInvalid.ok === false && acInvalid.errorKind === 'INVALID_USERNAME');

  eq('LeetCode parses /u/<handle> URLs', leetCodeAdapter.parseUsernameFromUrl('https://leetcode.com/u/neo_matrix'), 'neo_matrix');
  eq('LeetCode parses bare profile URLs', leetCodeAdapter.parseUsernameFromUrl('https://leetcode.com/neo_matrix'), 'neo_matrix');
  eq('LeetCode rejects reserved paths', leetCodeAdapter.parseUsernameFromUrl('https://leetcode.com/problemset'), null);
  eq('CodeChef parses /users/<handle> URLs', codeChefAdapter.parseUsernameFromUrl('https://www.codechef.com/users/code_chef_01'), 'code_chef_01');
  eq('AtCoder parses /users/<handle> URLs', atCoderAdapter.parseUsernameFromUrl('https://atcoder.jp/users/abc123'), 'abc123');
  eq('AtCoder ignores non-profile URLs', atCoderAdapter.parseUsernameFromUrl('https://atcoder.jp/contests/abc300'), null);

  // ── C. Profile lookup ──────────────────────────────────────────────────────
  section('C. Profile lookup (found / missing)');

  clearProviderCache();
  installFetch((url) => {
    if (url.includes('leetcode.com/graphql')) {
      return jsonBody({
        data: {
          matchedUser: {
            username: 'neo_matrix',
            profile: { realName: 'Neo Matrix', userAvatar: 'https://cdn/a.png', ranking: 111 },
            submitStatsGlobal: { acSubmissionNum: [{ difficulty: 'All', count: 321 }] },
          },
        },
      });
    }
    return { status: 500, body: '' };
  });
  const lcProfile = (await leetCodeAdapter.fetchProfile('neo_matrix')) as any;
  check('LeetCode profile lookup succeeds', lcProfile.ok === true);
  eq('LeetCode normalizes externalAccountId', lcProfile.data?.externalAccountId, 'neo_matrix');
  eq('LeetCode normalizes problemsSolved', lcProfile.data?.problemsSolved, 321);

  clearProviderCache();
  installFetch(() => jsonBody({ data: { matchedUser: null } }));
  const lcMissing = (await leetCodeAdapter.fetchProfile('ghost_user')) as any;
  check('LeetCode missing profile returns NOT_FOUND', lcMissing.ok === false && lcMissing.errorKind === 'NOT_FOUND');

  clearProviderCache();
  installFetch((url) =>
    url.includes('/users/code_chef_01')
      ? {
          status: 200,
          body: `<html><div class="rating-number">1852</div><span>4★</span><h3>Total Problems Solved: </h3><p>410</p></html>`,
        }
      : { status: 404, body: '' },
  );
  const ccProfile = (await codeChefAdapter.fetchProfile('code_chef_01')) as any;
  check('CodeChef scrape returns a profile', ccProfile.ok === true);
  eq('CodeChef scrapes rating', ccProfile.data?.currentRating, 1852);
  eq('CodeChef scrapes stars into rankTier', ccProfile.data?.rankTier, '4 Star');
  eq('CodeChef scrapes solved count', ccProfile.data?.problemsSolved, 410);

  clearProviderCache();
  installFetch(() => ({ status: 404, body: '' }));
  const ccMissing = (await codeChefAdapter.fetchProfile('nobody_here')) as any;
  check('CodeChef 404 returns NOT_FOUND', ccMissing.ok === false && ccMissing.errorKind === 'NOT_FOUND');

  clearProviderCache();
  installFetch((url) => (url.includes('/users/abc123') ? { status: 200, body: '<html>profile</html>' } : { status: 500, body: '' }));
  const acProfile = (await atCoderAdapter.validateProfile('abc123')) as any;
  check('AtCoder validateProfile succeeds for an existing handle', acProfile.ok === true);

  clearProviderCache();
  installFetch(() => ({ status: 404, body: '' }));
  const acMissing = (await atCoderAdapter.validateProfile('doesnotexist')) as any;
  check('AtCoder 404 returns NOT_FOUND (regression: 404 must not count as existing)', acMissing.ok === false && acMissing.errorKind === 'NOT_FOUND');

  // ── D. Unsupported capabilities never fabricate data ───────────────────────
  section('D. Unsupported capabilities return UNSUPPORTED (never zero)');

  const lcDaily = (await leetCodeAdapter.fetchDailyActivity()) as any;
  check('LeetCode fetchDailyActivity → UNSUPPORTED', lcDaily.ok === false && lcDaily.errorKind === 'UNSUPPORTED');
  const lcSubs = (await leetCodeAdapter.fetchAcceptedSubmissions()) as any;
  check('LeetCode fetchAcceptedSubmissions → UNSUPPORTED', lcSubs.ok === false && lcSubs.errorKind === 'UNSUPPORTED');
  const ccDaily = (await codeChefAdapter.fetchDailyActivity()) as any;
  check('CodeChef fetchDailyActivity → UNSUPPORTED', ccDaily.ok === false && ccDaily.errorKind === 'UNSUPPORTED');
  const ccContests = (await codeChefAdapter.fetchContestHistory()) as any;
  check('CodeChef fetchContestHistory → UNSUPPORTED', ccContests.ok === false && ccContests.errorKind === 'UNSUPPORTED');
  const ccRating = (await codeChefAdapter.fetchRatingHistory()) as any;
  check('CodeChef fetchRatingHistory → UNSUPPORTED', ccRating.ok === false && ccRating.errorKind === 'UNSUPPORTED');

  // ── E. History normalization + stable ids (idempotency proxy) ──────────────
  section('E. History normalization and stable activity ids');

  clearProviderCache();
  const lcHistoryPayload = {
    data: {
      userContestRankingHistory: [
        { attended: true, rating: 1500.4, ranking: 900, contest: { title: 'Weekly Contest 1', startTime: 1700000000 } },
        { attended: false, rating: 0, ranking: 0, contest: { title: 'Weekly Contest 2', startTime: 1700100000 } },
        { attended: true, rating: 1601.7, ranking: 800, contest: { title: 'Weekly Contest 3', startTime: 1700200000 } },
      ],
    },
  };
  installFetch(() => jsonBody(lcHistoryPayload));
  const lcRating = (await leetCodeAdapter.fetchRatingHistory('neo_matrix')) as any;
  check('LeetCode rating history succeeds', lcRating.ok === true);
  eq('LeetCode skips non-attended contests', lcRating.data?.length, 2);
  eq(
    'LeetCode uses a stable contest id (startTime, not index)',
    lcRating.data?.[0]?.externalActivityId,
    'lc-contest-1700000000',
  );
  const lcRating2 = (await leetCodeAdapter.fetchRatingHistory('neo_matrix')) as any;
  eq(
    'LeetCode repeated fetch yields identical ids (idempotent)',
    lcRating2.data?.map((p: any) => p.externalActivityId),
    lcRating.data?.map((p: any) => p.externalActivityId),
  );

  clearProviderCache();
  installFetch((url) => {
    if (url.includes('kenkoooo')) {
      return jsonBody([
        { id: 555, epoch_second: 1700300000, problem_id: 'abc300_a', contest_id: 'abc300', user_id: 'abc123', language: 'C++', point: 100, length: 500, result: 'AC' },
        { id: 556, epoch_second: 1700300100, problem_id: 'abc300_b', contest_id: 'abc300', user_id: 'abc123', language: 'C++', point: 0, length: 500, result: 'WA' },
      ]);
    }
    return { status: 500, body: '' };
  });
  const acSubs = (await atCoderAdapter.fetchAcceptedSubmissions('abc123')) as any;
  check('AtCoder submissions succeed', acSubs.ok === true);
  eq('AtCoder returns accepted submissions only', acSubs.data?.length, 1);
  eq('AtCoder uses the provider submission id', acSubs.data?.[0]?.externalActivityId, '555');
  eq('AtCoder converts epoch seconds to ISO', acSubs.data?.[0]?.submittedAt, new Date(1700300000 * 1000).toISOString());

  const acDaily = (await atCoderAdapter.fetchDailyActivity('abc123')) as any;
  check('AtCoder daily activity succeeds', acDaily.ok === true);
  eq('AtCoder daily activity is keyed by UTC day', acDaily.data?.[0]?.date?.length, 10);

  clearProviderCache();
  installFetch((url) =>
    url.includes('/history/json')
      ? jsonBody([{ IsRated: true, Place: 42, OldRating: 1200, NewRating: 1250, Performance: 1300, ContestName: 'ABC 300', ContestScreenName: 'abc300', EndTime: '2023-11-15T12:00:00.000Z' }])
      : { status: 200, body: '<html></html>' },
  );
  const acContests = (await atCoderAdapter.fetchContestHistory('abc123')) as any;
  check('AtCoder contest history succeeds', acContests.ok === true);
  eq('AtCoder contest id uses ContestScreenName', acContests.data?.[0]?.externalActivityId, 'abc300');

  // ── F. Failure handling ────────────────────────────────────────────────────
  section('F. Failure handling (timeout / rate limit / provider error)');

  clearProviderCache();
  installFetch(() => 'abort');
  const lcTimeout = (await leetCodeAdapter.fetchProfile('timeout_user')) as any;
  check('LeetCode timeout classified as TIMEOUT', lcTimeout.ok === false && lcTimeout.errorKind === 'TIMEOUT');

  clearProviderCache();
  installFetch(() => ({ status: 429, body: 'too many requests' }));
  const acRate = (await atCoderAdapter.validateProfile('ratelimited')) as any;
  check('AtCoder 429 classified as RATE_LIMITED', acRate.ok === false && acRate.errorKind === 'RATE_LIMITED');

  clearProviderCache();
  installFetch(() => ({ status: 503, body: 'service unavailable' }));
  const acDown = (await atCoderAdapter.validateProfile('provider_down')) as any;
  check('AtCoder 5xx classified as PROVIDER_ERROR', acDown.ok === false && acDown.errorKind === 'PROVIDER_ERROR');

  clearProviderCache();
  installFetch(() => ({ status: 200, body: '<html>unexpected page, no rating markers</html>' }));
  const ccBlank = (await codeChefAdapter.fetchProfile('blank_profile')) as any;
  check('CodeChef unparseable page does not fabricate zeros', ccBlank.ok === true && ccBlank.data?.currentRating === undefined);

  // ── G. Timestamp plausibility ──────────────────────────────────────────────
  section('G. Timestamp plausibility (incorrect timestamps)');

  check('valid recent ISO timestamp accepted', isPlausibleOccurrence('2024-01-15T10:00:00.000Z'));
  check('Date instance accepted', isPlausibleOccurrence(new Date('2024-06-01T00:00:00.000Z')));
  check('pre-2005 timestamp rejected', !isPlausibleOccurrence('1999-12-31T23:59:59.000Z'));
  check('far-future timestamp rejected', !isPlausibleOccurrence(new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()));
  check('unparseable string rejected', !isPlausibleOccurrence('not-a-date'));
  check('null rejected', !isPlausibleOccurrence(null));

  // ── H. Evidence labelling ──────────────────────────────────────────────────
  section('H. Evidence labelling from real apiKind (no false OFFICIAL claims)');

  eq('OFFICIAL → PROVIDER_OFFICIAL_API', mapVerificationMethod('OFFICIAL'), 'PROVIDER_OFFICIAL_API');
  eq('DOCUMENTED_UNOFFICIAL → PROVIDER_DOCUMENTED_UNOFFICIAL', mapVerificationMethod('DOCUMENTED_UNOFFICIAL'), 'PROVIDER_DOCUMENTED_UNOFFICIAL');
  eq('COMMUNITY → PROVIDER_COMMUNITY_MIRROR', mapVerificationMethod('COMMUNITY'), 'PROVIDER_COMMUNITY_MIRROR');
  eq('SCRAPED → PROVIDER_PUBLIC_SCRAPE', mapVerificationMethod('SCRAPED'), 'PROVIDER_PUBLIC_SCRAPE');

  // ── I. Platform streaks (derived, not stored in StudentDailyStreak) ────────
  section('I. Platform-specific streak derivation');

  const asOf = new Date('2024-03-10T12:00:00.000Z');
  const streakRows = [
    { sourcePlatform: 'LEETCODE', occurredAt: '2024-03-08T10:00:00.000Z' },
    { sourcePlatform: 'LEETCODE', occurredAt: '2024-03-09T10:00:00.000Z' },
    { sourcePlatform: 'LEETCODE', occurredAt: '2024-03-10T10:00:00.000Z' },
    { sourcePlatform: 'ATCODER', occurredAt: '2024-03-01T10:00:00.000Z' },
    { sourcePlatform: 'ATCODER', occurredAt: '2024-03-02T10:00:00.000Z' },
    { sourcePlatform: 'NOT_A_DATE', occurredAt: 'invalid' },
  ];
  const streaks = computePlatformStreaks(streakRows, { asOf });
  const lcStreak = streaks.find((s) => s.platform === 'LEETCODE');
  const acStreak = streaks.find((s) => s.platform === 'ATCODER');
  eq('one summary per platform (invalid dates dropped)', streaks.length, 2);
  eq('LeetCode current streak counted from today', lcStreak?.currentStreak, 3);
  eq('LeetCode longest streak correct', lcStreak?.longestStreak, 3);
  eq('AtCoder lapsed streak is zero (not carried over)', acStreak?.currentStreak, 0);
  eq('AtCoder longest streak retained', acStreak?.longestStreak, 2);
  eq('streaks are platform-isolated', lcStreak?.platform, 'LEETCODE');

  // ── J. Ownership challenge ─────────────────────────────────────────────────
  section('J. Ownership challenge token (credential-free)');

  const tokenA = buildChallengeToken('student-1', 'LEETCODE', 'neo_matrix');
  const tokenA2 = buildChallengeToken('student-1', 'LEETCODE', 'neo_matrix');
  const tokenB = buildChallengeToken('student-2', 'LEETCODE', 'neo_matrix');
  const tokenC = buildChallengeToken('student-1', 'LEETCODE', 'NEO_MATRIX');
  check('challenge token is deterministic', tokenA !== null && tokenA === tokenA2);
  check('handles are case/space normalized (same token)', tokenA === tokenC || (tokenA !== null && tokenA === buildChallengeToken('student-1', 'LEETCODE', '  neo_matrix  ')));
  check('different students get different tokens for the same handle', tokenA !== tokenB);
  check('token carries the CAREERAI-VERIFY prefix', Boolean(tokenA?.startsWith('CAREERAI-VERIFY-')));

  const previousSecret = process.env.OWNERSHIP_CHALLENGE_SECRET;
  delete process.env.OWNERSHIP_CHALLENGE_SECRET;
  const previousJwt = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  eq('no configured secret → no token issued', buildChallengeToken('student-1', 'LEETCODE', 'neo_matrix'), null);
  process.env.OWNERSHIP_CHALLENGE_SECRET = previousSecret;
  if (previousJwt) process.env.JWT_SECRET = previousJwt;

  eq('normalizeFieldValue uppercases', normalizeFieldValue('abc'), 'ABC');
  eq('normalizeFieldValue strips zero-width characters', normalizeFieldValue('CAREERAI\u200B-VERIFY-XX'), 'CAREERAI-VERIFY-XX');
  check('fieldContainsToken matches a decorated public field', fieldContainsToken('My bio ⬇ careerai-verify-AA11  thanks', 'CAREERAI-VERIFY-aa11'));
  check('fieldContainsToken survives zero-width noise', fieldContainsToken('CAREERAI-\u200BVERIFY-AA11', 'CAREERAI-VERIFY-AA11'));
  check('fieldContainsToken rejects a different token', !fieldContainsToken('CAREERAI-VERIFY-BB22', 'CAREERAI-VERIFY-AA11'));
  check('fieldContainsToken rejects an empty field', !fieldContainsToken(null, 'CAREERAI-VERIFY-AA11'));

  // ── K. Ownership state policy (PROFILE_EXISTS ≠ OWNERSHIP_VERIFIED) ────────
  section('K. Ownership state policy (badge gating)');

  eq('legacy VERIFIED maps to PROFILE_EXISTS', normalizeOwnershipStatus('VERIFIED'), 'PROFILE_EXISTS');
  eq('legacy FORMAT_VERIFIED maps to PROFILE_EXISTS', normalizeOwnershipStatus('FORMAT_VERIFIED'), 'PROFILE_EXISTS');
  eq('unknown value maps to PROFILE_EXISTS (conservative)', normalizeOwnershipStatus('WHATEVER'), 'PROFILE_EXISTS');
  eq('OWNERSHIP_VERIFIED preserved', normalizeOwnershipStatus('OWNERSHIP_VERIFIED'), 'OWNERSHIP_VERIFIED');

  check('PROFILE_EXISTS is NOT eligible for a high-value badge', !isEligibleForExternalAchievementBadge('PROFILE_EXISTS').eligible);
  check('OWNERSHIP_UNVERIFIED is NOT eligible for a high-value badge', !isEligibleForExternalAchievementBadge('OWNERSHIP_UNVERIFIED').eligible);
  check('legacy VERIFIED is NOT eligible for a high-value badge', !isEligibleForExternalAchievementBadge('VERIFIED').eligible);
  check('OWNERSHIP_VERIFIED IS eligible for a high-value badge', isEligibleForExternalAchievementBadge('OWNERSHIP_VERIFIED').eligible);

  // ── L. Public ownership-field reads ────────────────────────────────────────
  section('L. Public ownership field reads (anonymous, no credentials)');

  clearProviderCache();
  installFetch((url) =>
    url.includes('leetcode.com/graphql')
      ? jsonBody({ data: { matchedUser: { username: 'neo_matrix', profile: { aboutMe: 'Hello CAREERAI-VERIFY-AA11 world' } } } })
      : { status: 500, body: '' },
  );
  const lcField = (await leetCodeAdapter.fetchPublicOwnershipField('neo_matrix')) as any;
  check('LeetCode exposes the public aboutMe field', lcField.ok === true && lcField.data?.field === 'aboutMe');
  check('LeetCode returns the current public field value', typeof lcField.data?.value === 'string' && lcField.data.value.includes('CAREERAI-VERIFY-AA11'));

  clearProviderCache();
  installFetch(() => jsonBody({ data: { matchedUser: { username: 'quiet_user', profile: { aboutMe: '' } } } }));
  const lcEmpty = (await leetCodeAdapter.fetchPublicOwnershipField('quiet_user')) as any;
  eq('empty aboutMe is reported as null (not a fabricated token)', lcEmpty.data?.value, null);

  check(
    'CodeChef has no public editable field (ownership NONE, no field reader)',
    (codeChefAdapter as any).fetchPublicOwnershipField === undefined,
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failures.length}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('All mocked-provider checks passed.');
  }
  console.log('════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exitCode = 1;
});
