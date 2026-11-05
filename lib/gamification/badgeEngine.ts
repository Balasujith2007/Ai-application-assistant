import prisma from '@/lib/prisma';
import {
  BADGE_CATALOG,
  BadgeCategory,
  BadgeDefinition,
  BadgeStatus,
  StudentActivityStats,
} from './badgeConfig';
import {
  EffectiveBadge,
  getBadgeEvaluator,
  getEffectiveBadgeCatalog,
  getEffectiveBadgeMap,
} from './badgeCatalogService';
import { buildCredentialId, buildVerificationPath, ISSUING_ORGANIZATION } from './badgeCredentials';
import { verificationLedger } from '../leaderboard/verificationLedger';

/**
 * Timezone-aware date helper for consistent daily streak tracking.
 * Configured default: 'Asia/Kolkata' (IST).
 */
export function getFormattedDateInTz(date: Date = new Date(), timeZone: string = 'Asia/Kolkata'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Outputs YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Activity types that count as *qualifying career activity* for streaks and
 * badges. Page visits, logins, scrolling and other meaningless actions are
 * deliberately excluded, as is any LMS/course activity.
 */
export const QUALIFYING_ACTIVITY_TYPES = [
  'APPLICATION_SUBMITTED',
  'APPLICATION_STATUS_CHANGE',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_ATTENDED',
  'HACKATHON_REGISTERED',
  'COMPETITION_REGISTERED',
  'PROJECT_SUBMITTED',
  'COMPETITION_OUTCOME',
  'RESUME_UPLOADED',
  'RESUME_REVIEWED',
  'PROFILE_UPDATED',
  'SKILL_ADDED',
  'PROJECT_ADDED',
  'EXPERIENCE_ADDED',
  // Legacy/higher-level buckets written by the daily check-in service.
  'CHECKIN',
  'DAILY_CHECKIN',
  'CODING',
  'INTERNSHIP',
  'HACKATHON',
] as const;

const QUALIFYING_ACTIVITY_SET = new Set<string>(QUALIFYING_ACTIVITY_TYPES);

/** Career-application types counted for the Career Excellence badges. */
const CAREER_APPLICATION_TYPES = ['INTERNSHIP', 'JOB'];
const SUBMITTED_STATUSES = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'DISQUALIFIED'];
const SHORTLIST_STATUSES = ['SHORTLISTED', 'INTERVIEW', 'SELECTED'];
const INTERVIEW_STAGE_STATUSES = ['INTERVIEW', 'SELECTED'];
const COMPETITION_TYPES = ['HACKATHON', 'COMPETITION'];

/** Rank ordering used to de-duplicate competition outcomes (best wins). */
const OUTCOME_RANK: Record<string, number> = { submitted: 1, finalist: 2, podium: 3, winner: 4 };

interface BadgeInsertResult {
  inserted: boolean;
}

export class BadgeEngine {
  /**
   * Records a *verified qualifying* daily career activity and updates streaks
   * idempotently. Non-qualifying activity types are rejected so meaningless
   * actions (page views etc.) never extend a streak.
   */
  async recordDailyActivity(
    studentId: string,
    activityType: string,
    sourceReference?: string,
    activityDateOverride?: string
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    recorded: boolean;
  }> {
    const normalized = (activityType || '').toUpperCase();
    if (!QUALIFYING_ACTIVITY_SET.has(normalized)) {
      const streak = await this.calculateStreak(studentId);
      return { ...streak, recorded: false };
    }

    const activityDate = activityDateOverride || getFormattedDateInTz();

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO student_daily_streaks (id, "studentId", "activityDate", "activityType", "sourceReference", "qualifyingScore", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 1.0, NOW())
         ON CONFLICT ("studentId", "activityDate") DO NOTHING`,
        `streak_${studentId}_${activityDate}`,
        studentId,
        activityDate,
        normalized,
        sourceReference || null
      );
    } catch {
      // Ignore conflict / transient error — streak recalculation below is safe.
    }

    const streak = await this.calculateStreak(studentId);
    return { ...streak, recorded: true };
  }

  /**
   * Computes consecutive streak, longest streak and active days from verified
   * records only (Asia/Kolkata day boundaries). Never fabricates records.
   */
  async calculateStreak(studentId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    activeWeeksInMonth: number;
    comebackDays: number;
  }> {
    const rawStreaks = await prisma.$queryRawUnsafe<Array<{ activityDate: string }>>(
      `SELECT DISTINCT "activityDate" FROM student_daily_streaks
       WHERE "studentId" = $1
       ORDER BY "activityDate" DESC`,
      studentId
    );

    if (!rawStreaks || rawStreaks.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0, activeWeeksInMonth: 0, comebackDays: 0 };
    }

    const uniqueDates = Array.from(new Set(rawStreaks.map((r) => r.activityDate))).sort().reverse();
    const totalActiveDays = uniqueDates.length;

    const todayStr = getFormattedDateInTz();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getFormattedDateInTz(yesterday);

    let currentStreak = 0;
    const pointerDate =
      uniqueDates[0] === todayStr ? todayStr : uniqueDates[0] === yesterdayStr ? yesterdayStr : null;

    if (pointerDate) {
      currentStreak = 1;
      let cur = new Date(pointerDate);
      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedPrev = new Date(cur);
        expectedPrev.setDate(expectedPrev.getDate() - 1);
        if (uniqueDates[i] === getFormattedDateInTz(expectedPrev)) {
          currentStreak++;
          cur = expectedPrev;
        } else {
          break;
        }
      }
    }

    let longestStreak = currentStreak;
    let tempStreak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const cur = new Date(uniqueDates[i]);
      const prev = new Date(uniqueDates[i + 1]);
      const diffDays = Math.round((cur.getTime() - prev.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }

    const curYearMonth = todayStr.slice(0, 7);
    const weeksSet = new Set<number>();
    uniqueDates
      .filter((d) => d.startsWith(curYearMonth))
      .forEach((d) => weeksSet.add(Math.ceil(parseInt(d.slice(8, 10), 10) / 7)));
    const activeWeeksInMonth = weeksSet.size;

    let comebackDays = 0;
    if (currentStreak >= 3 && uniqueDates.length > currentStreak) {
      const lastActiveBeforeStreak = new Date(uniqueDates[currentStreak]);
      const firstActiveOfStreak = new Date(uniqueDates[currentStreak - 1]);
      const gap = Math.round(
        (firstActiveOfStreak.getTime() - lastActiveBeforeStreak.getTime()) / (1000 * 3600 * 24)
      );
      if (gap >= 2) comebackDays = currentStreak;
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalActiveDays,
      activeWeeksInMonth,
      comebackDays,
    };
  }

  /**
   * Aggregates authoritative student statistics from real, verified platform
   * records only. Monthly fields are intentionally left undefined here — they
   * are supplied by the monthly recognition engine.
   */
  async gatherStudentStats(studentId: string): Promise<StudentActivityStats> {
    const [
      applications,
      interviews,
      completedInterviewSteps,
      registrations,
      verifiedCompetitionActivities,
      profile,
      resumes,
      snapshots,
    ] = await Promise.all([
      prisma.application.findMany({
        where: { userId: studentId, applicationType: { in: CAREER_APPLICATION_TYPES as never } },
        select: { id: true, status: true, companyName: true },
      }),
      prisma.interview.findMany({
        where: { userId: studentId },
        select: { id: true, feedback: true },
      }),
      prisma.opportunityWorkflowStep.findMany({
        where: { registration: { studentId }, stepType: 'INTERVIEW', status: 'COMPLETED' },
        select: { id: true },
      }),
      prisma.opportunityRegistration.findMany({
        where: { studentId, opportunity: { type: { in: COMPETITION_TYPES as never } } },
        select: { id: true, opportunityId: true, status: true, outcome: true, verificationMethod: true, verifiedAt: true, confirmedAt: true },
      }),
      prisma.verifiedActivity.findMany({
        where: {
          studentId,
          verificationStatus: 'VERIFIED',
          OR: [{ sourceType: 'HACKATHON' }, { activityType: { startsWith: 'HACKATHON_' } }],
        },
        select: { id: true, activityType: true, opportunityId: true, externalActivityId: true },
      }),
      prisma.profile.findUnique({
        where: { userId: studentId },
        select: {
          phone: true,
          location: true,
          careerObjective: true,
          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          department: true,
          year: true,
          section: true,
          college: true,
          cgpa: true,
          skills: { select: { skillId: true } },
          projects: { select: { id: true } },
          experiences: { select: { id: true, company: true } },
        },
      }),
      prisma.resume.findMany({
        where: { userId: studentId },
        select: { isActive: true, reviewStatus: true, uploadedAt: true },
      }),
      prisma.weeklyPerformanceSnapshot.findMany({
        where: { studentId },
        orderBy: { weekKey: 'desc' },
        take: 2,
        select: { careerBreakdown: true },
      }),
    ]);

    // ── A. Career Excellence ───────────────────────────────────────────────
    const applicationsSubmitted = applications.filter((a) => SUBMITTED_STATUSES.includes(a.status)).length;
    const shortlistCount = applications.filter((a) => SHORTLIST_STATUSES.includes(a.status)).length;
    const interviewStageCount = applications.filter((a) => INTERVIEW_STAGE_STATUSES.includes(a.status)).length;
    // "Attended" requires evidence of completion — a recorded interview outcome
    // (feedback) or a completed interview workflow step. Scheduling alone is not
    // sufficient, so a merely scheduled interview never earns this badge.
    const attendedInterviews = interviews.filter((i) => (i.feedback ?? '').trim().length > 0).length;
    const interviewsAttendedCount = attendedInterviews + completedInterviewSteps.length;
    const selectionCount = applications.filter((a) => a.status === 'SELECTED').length;

    const experienceCompanies = new Set(
      (profile?.experiences ?? []).map((e) => (e.company || '').toLowerCase().trim()).filter(Boolean)
    );
    const internshipCompletedCount = applications.filter(
      (a) =>
        a.status === 'SELECTED' &&
        experienceCompanies.has((a.companyName || '').toLowerCase().trim())
    ).length;

    // ── B. Innovation & Competition ────────────────────────────────────────
    const confirmedRegistrations = registrations.filter(
      (r) =>
        r.status !== 'STARTED' ||
        Boolean(r.verificationMethod) ||
        Boolean(r.verifiedAt) ||
        Boolean(r.confirmedAt)
    );

    // One best outcome per distinct competition (verified activities + registrations).
    const bestOutcome = new Map<string, number>();
    const recordOutcome = (key: string, kind: string | null) => {
      if (!kind) return;
      const rank = OUTCOME_RANK[kind] ?? 0;
      if ((bestOutcome.get(key) ?? 0) < rank) bestOutcome.set(key, rank);
    };
    for (const reg of confirmedRegistrations) {
      recordOutcome(reg.opportunityId ?? reg.id, this.classifyOutcome(reg.outcome));
    }
    for (const act of verifiedCompetitionActivities) {
      const key = act.opportunityId ?? act.externalActivityId ?? act.id;
      const kind =
        act.activityType === 'HACKATHON_WINNER'
          ? 'winner'
          : act.activityType === 'HACKATHON_FINALIST'
          ? 'finalist'
          : act.activityType === 'HACKATHON_PROJECT_SUBMITTED'
          ? 'submitted'
          : null;
      recordOutcome(key, kind);
    }
    const outcomeRanks = Array.from(bestOutcome.values());
    const competitionRegistrations = confirmedRegistrations.length;
    const projectSubmissionsCount = outcomeRanks.filter((r) => r >= 1).length;
    const finalistCount = outcomeRanks.filter((r) => r >= 2).length;
    const podiumCount = outcomeRanks.filter((r) => r === 3).length;
    const winnerCount = outcomeRanks.filter((r) => r === 4).length;

    // ── C. Consistency & Streak ────────────────────────────────────────────
    const streakStats = await this.calculateStreak(studentId);

    // ── D. Professional Development ────────────────────────────────────────
    const skillsCount = profile?.skills?.length ?? 0;
    const projectsCount = profile?.projects?.length ?? 0;
    const experiencesCount = profile?.experiences?.length ?? 0;

    const completenessItems = [
      Boolean(profile?.careerObjective),
      Boolean(profile?.phone),
      Boolean(profile?.location),
      Boolean(profile?.linkedinUrl),
      Boolean(profile?.githubUrl),
      Boolean(profile?.portfolioUrl),
      Boolean(profile?.department),
      Boolean(profile?.year),
      Boolean(profile?.section),
      Boolean(profile?.college),
      Boolean(profile?.cgpa),
      skillsCount > 0,
      projectsCount > 0,
      experiencesCount > 0,
    ];
    const profileCompleteness = Math.round(
      (completenessItems.filter(Boolean).length / completenessItems.length) * 100
    );

    const activeResume = resumes.find((r) => r.isActive) ?? resumes[0];
    const resumeUploaded = resumes.length > 0;
    const resumeReviewed = Boolean(activeResume?.reviewStatus === 'REVIEWED');

    const latestResumeStrength = this.readResumeStrength(snapshots[0]?.careerBreakdown);
    const previousResumeStrength = this.readResumeStrength(snapshots[1]?.careerBreakdown);
    const resumeStrengthImproved =
      snapshots.length === 2 && latestResumeStrength - previousResumeStrength >= 10;

    return {
      applicationsSubmitted,
      shortlistCount,
      interviewStageCount,
      interviewsAttendedCount,
      selectionCount,
      internshipCompletedCount,

      competitionRegistrations,
      projectSubmissionsCount,
      finalistCount,
      podiumCount,
      winnerCount,

      currentStreakDays: streakStats.currentStreak,
      longestStreakDays: streakStats.longestStreak,
      totalActiveDays: streakStats.totalActiveDays,
      activeWeeksInMonth: streakStats.activeWeeksInMonth,

      profileCompleteness,
      resumeUploaded,
      resumeReviewed,
      resumeStrengthScore: latestResumeStrength,
      resumeStrengthImproved,
      skillsCount,
      projectsCount,
      experiencesCount,
    };
  }

  private classifyOutcome(outcome: string | null | undefined): string | null {
    if (!outcome) return null;
    const o = outcome.toLowerCase();
    if (o.includes('win') || o.includes('prize') || o.includes('1st') || o.includes('first')) return 'winner';
    if (o.includes('2nd') || o.includes('3rd') || o.includes('second') || o.includes('third') || o.includes('runner')) return 'podium';
    if (o.includes('final')) return 'finalist';
    if (o.includes('submit') || o.includes('project')) return 'submitted';
    return null;
  }

  private readResumeStrength(raw: unknown): number {
    if (!raw || typeof raw !== 'object') return 0;
    const categories = (raw as { categories?: { resumeStrength?: { rawScore?: number } } }).categories;
    const value = categories?.resumeStrength?.rawScore;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  /**
   * Inserts a badge row idempotently. Retries without the credential columns
   * when the additive migration has not been applied yet, so the engine keeps
   * awarding badges on both pre- and post-migration schemas.
   */
  private async insertBadgeRow(params: {
    studentId: string;
    badge: EffectiveBadge;
    evidenceJson: string;
    credentialId: string | null;
    awardSource: string;
    awardedById: string | null;
  }): Promise<BadgeInsertResult> {
    const { studentId, badge, evidenceJson, credentialId, awardSource, awardedById } = params;
    const rowId = `badge_${studentId}_${badge.id}`;

    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO student_badges (
           id, "studentId", "badgeId", category, tier, title, description, icon,
           "awardedAt", "evidenceData", "unlockedToastSeen",
           "credentialId", "awardSource", "awardedById", "credentialStatus",
           "createdAt", "updatedAt"
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, FALSE, $10, $11, $12, 'VALID', NOW(), NOW())
         ON CONFLICT ("studentId", "badgeId") DO NOTHING
         RETURNING id`,
        rowId,
        studentId,
        badge.id,
        badge.category,
        badge.tier,
        badge.title,
        badge.description,
        badge.icon,
        evidenceJson,
        credentialId,
        awardSource,
        awardedById
      );
      return { inserted: rows.length > 0 };
    } catch {
      // Pre-migration schema fallback (no credential columns).
      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO student_badges (
             id, "studentId", "badgeId", category, tier, title, description, icon,
             "awardedAt", "evidenceData", "unlockedToastSeen", "createdAt", "updatedAt"
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, FALSE, NOW(), NOW())
           ON CONFLICT ("studentId", "badgeId") DO NOTHING
           RETURNING id`,
          rowId,
          studentId,
          badge.id,
          badge.category,
          badge.tier,
          badge.title,
          badge.description,
          badge.icon,
          evidenceJson
        );
        return { inserted: rows.length > 0 };
      } catch (err) {
        console.error(`Error awarding badge ${badge.id} to student ${studentId}:`, err);
        return { inserted: false };
      }
    }
  }

  /** Writes an idempotent achievement-history row (deterministic id). */
  private async writeAchievementHistory(
    studentId: string,
    badge: EffectiveBadge,
    xpEarned: number,
    eventDetails: string
  ): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO achievement_history (id, "studentId", "badgeId", title, category, "xpEarned", "eventDetails", "achievedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO NOTHING`,
        `hist_${studentId}_${badge.id}`,
        studentId,
        badge.id,
        badge.title,
        badge.category,
        xpEarned,
        eventDetails
      );
    } catch (err) {
      console.error(`Error writing achievement history for ${badge.id}:`, err);
    }
  }

  /** Awards badge XP through the auditable, idempotent points ledger. */
  private async awardBadgeXp(studentId: string, badge: EffectiveBadge, xp: number): Promise<void> {
    if (xp <= 0) return;
    const actId = `act_badge_${studentId}_${badge.id}`;
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO verified_activities (
           id, "studentId", "sourceType", "sourcePlatform", "activityType", "externalActivityId", "verificationStatus", "verifiedAt", "createdAt", "updatedAt"
         ) VALUES ($1, $2, 'CONSISTENCY', 'CAREERAI', 'BADGE_BONUS', $3, 'VERIFIED', NOW(), NOW(), NOW())
         ON CONFLICT ("studentId", "sourceType", "sourcePlatform", "externalActivityId", "activityType") DO NOTHING`,
        actId,
        studentId,
        badge.id
      );
      await verificationLedger.awardPoints({
        studentId,
        verifiedActivityId: actId,
        category: 'CONSISTENCY',
        pointsAwarded: xp,
        reason: `Achievement Reward: Unlocked ${badge.title} badge (+${xp} XP)`,
        periodKey: 'ALL_TIME',
      });
    } catch (err) {
      console.error(`Error awarding badge XP for ${badge.id}:`, err);
    }
  }

  private async recordAudit(input: {
    studentId: string;
    badgeId: string;
    action: 'GRANT' | 'REVOKE';
    source: 'ENGINE' | 'MONTHLY' | 'MANUAL';
    reason: string;
    actorId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await prisma.badgeAwardAudit.create({
        data: {
          studentId: input.studentId,
          badgeId: input.badgeId,
          action: input.action,
          source: input.source,
          reason: input.reason,
          actorId: input.actorId ?? null,
          metadata: (input.metadata as never) ?? undefined,
        },
      });
    } catch {
      // Audit table not migrated yet — never block the award/revoke itself.
    }
  }

  /**
   * Evaluates every ENGINE badge for a student using the effective (DB-backed)
   * thresholds and awards newly-eligible badges idempotently. Safe to call
   * repeatedly and under concurrency: duplicate awards are prevented by the
   * `(studentId, badgeId)` unique constraint and the ledger's unique key.
   */
  async evaluateAndAwardBadges(studentId: string): Promise<{
    newlyUnlocked: EffectiveBadge[];
    newlyAwarded: EffectiveBadge[];
    totalEarned: number;
    totalAvailable: number;
  }> {
    const [stats, catalog, existingRows] = await Promise.all([
      this.gatherStudentStats(studentId),
      getEffectiveBadgeCatalog(),
      prisma.$queryRawUnsafe<Array<{ badgeId: string }>>(
        `SELECT "badgeId" FROM student_badges WHERE "studentId" = $1`,
        studentId
      ),
    ]);

    const earnedIds = new Set(existingRows.map((b) => b.badgeId));
    const engineBadges = catalog.filter((b) => b.awardSource === 'ENGINE' && b.active);
    const newlyUnlocked: EffectiveBadge[] = [];

    for (const badge of engineBadges) {
      if (earnedIds.has(badge.id)) continue;

      const evaluator = getBadgeEvaluator(badge.id);
      if (!evaluator) continue;

      const evaluation = evaluator.evaluate(stats, badge.threshold);
      if (!evaluation.isEligible) continue;

      const awardedAt = new Date();
      const credentialId = buildCredentialId(studentId, badge.id, awardedAt);

      const { inserted } = await this.insertBadgeRow({
        studentId,
        badge,
        evidenceJson: JSON.stringify({ ...evaluation, awardSource: 'ENGINE', awardedAt: awardedAt.toISOString() }),
        credentialId,
        awardSource: 'ENGINE',
        awardedById: null,
      });

      if (!inserted) {
        // Already awarded by a concurrent run — do not duplicate side effects.
        earnedIds.add(badge.id);
        continue;
      }

      await this.writeAchievementHistory(
        studentId,
        badge,
        badge.xpReward,
        `Earned ${badge.title} (${badge.tier}): ${badge.criteria}`
      );
      await this.awardBadgeXp(studentId, badge, badge.xpReward);
      await this.recordAudit({
        studentId,
        badgeId: badge.id,
        action: 'GRANT',
        source: 'ENGINE',
        reason: `Engine award: ${badge.criteria}`,
        metadata: { evaluation, credentialId },
      });

      newlyUnlocked.push(badge);
      earnedIds.add(badge.id);
    }

    return {
      newlyUnlocked,
      newlyAwarded: newlyUnlocked,
      totalEarned: earnedIds.size,
      totalAvailable: catalog.length,
    };
  }

  /**
   * Awards a monthly (or manual) badge on behalf of the monthly engine or a
   * Super Admin. Idempotent and audited.
   */
  async awardBadgeOnBehalf(input: {
    studentId: string;
    badgeId: string;
    source: 'MONTHLY' | 'MANUAL';
    reason: string;
    actorId?: string | null;
    evidence?: Record<string, unknown> | null;
  }): Promise<{ ok: boolean; awarded: boolean; credentialId?: string; error?: string }> {
    const map = await getEffectiveBadgeMap();
    const badge = map.get(input.badgeId);
    if (!badge) return { ok: false, awarded: false, error: `Unknown badge: ${input.badgeId}` };

    const awardedAt = new Date();
    const credentialId = buildCredentialId(input.studentId, badge.id, awardedAt);

    const { inserted } = await this.insertBadgeRow({
      studentId: input.studentId,
      badge,
      evidenceJson: JSON.stringify({
        awardSource: input.source,
        reason: input.reason,
        awardedAt: awardedAt.toISOString(),
        ...(input.evidence ?? {}),
      }),
      credentialId,
      awardSource: input.source,
      awardedById: input.actorId ?? null,
    });

    if (!inserted) return { ok: true, awarded: false };

    await this.writeAchievementHistory(input.studentId, badge, badge.xpReward, input.reason);
    await this.awardBadgeXp(input.studentId, badge, badge.xpReward);
    await this.recordAudit({
      studentId: input.studentId,
      badgeId: badge.id,
      action: 'GRANT',
      source: input.source,
      reason: input.reason,
      actorId: input.actorId ?? null,
      metadata: input.evidence ?? null,
    });

    return { ok: true, awarded: true, credentialId };
  }

  /**
   * Revokes a badge's credential without deleting the award record (historical
   * achievements and evidence are preserved). Always audited.
   */
  async revokeBadge(input: {
    studentId: string;
    badgeId: string;
    reason: string;
    actorId?: string | null;
    source?: 'MONTHLY' | 'MANUAL';
  }): Promise<{ ok: boolean; error?: string }> {
    const reason = (input.reason || '').trim();
    if (!reason) return { ok: false, error: 'A reason is required to revoke a badge.' };

    try {
      const existing = await prisma.$queryRawUnsafe<Array<{ credentialId: string | null; credentialStatus: string | null }>>(
        `SELECT "credentialId", "credentialStatus" FROM student_badges WHERE "studentId" = $1 AND "badgeId" = $2`,
        input.studentId,
        input.badgeId
      );
      if (!existing.length) return { ok: false, error: 'Badge not awarded to this student.' };

      await prisma.$executeRawUnsafe(
        `UPDATE student_badges
         SET "credentialStatus" = 'REVOKED', "revokedAt" = NOW(), "revokedReason" = $3, "updatedAt" = NOW()
         WHERE "studentId" = $1 AND "badgeId" = $2`,
        input.studentId,
        input.badgeId,
        reason
      );

      await this.recordAudit({
        studentId: input.studentId,
        badgeId: input.badgeId,
        action: 'REVOKE',
        source: input.source ?? 'MANUAL',
        reason,
        actorId: input.actorId ?? null,
        metadata: { previousCredentialStatus: existing[0].credentialStatus },
      });

      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.message ?? String(error) };
    }
  }

  /**
   * Returns comprehensive gamification overview: all badges (earned, in
   * progress, locked), precise criteria, credential metadata, next milestone
   * and recent achievement history. Progress is only reported where it can be
   * measured reliably.
   */
  async getStudentBadgesOverview(studentId: string) {
    await this.evaluateAndAwardBadges(studentId);

    const [stats, catalog, awardedRows, historyRows, xpAgg] = await Promise.all([
      this.gatherStudentStats(studentId),
      getEffectiveBadgeCatalog(),
      prisma.$queryRawUnsafe<
        Array<{
          badgeId: string;
          tier: string;
          awardedAt: Date;
          unlockedToastSeen: boolean;
          credentialId: string | null;
          credentialStatus: string | null;
          awardSource: string | null;
        }>
      >(
        `SELECT "badgeId", tier, "awardedAt", "unlockedToastSeen", "credentialId", "credentialStatus", "awardSource"
         FROM student_badges
         WHERE "studentId" = $1
         ORDER BY "awardedAt" DESC`,
        studentId
      ),
      prisma.$queryRawUnsafe<
        Array<{
          id: string;
          badgeId: string;
          title: string;
          category: string;
          xpEarned: number;
          eventDetails: string;
          achievedAt: Date;
        }>
      >(
        `SELECT id, "badgeId", title, category, "xpEarned", "eventDetails", "achievedAt"
         FROM achievement_history
         WHERE "studentId" = $1
         ORDER BY "achievedAt" DESC
         LIMIT 12`,
        studentId
      ),
      prisma.pointsLedger.aggregate({ where: { studentId }, _sum: { pointsAwarded: true } }),
    ]);

    const awardedMap = new Map<
      string,
      {
        tier: string;
        awardedAt: string;
        unlockedToastSeen: boolean;
        credentialId: string | null;
        credentialStatus: string;
        awardSource: string;
      }
    >();
    awardedRows.forEach((r) => {
      awardedMap.set(r.badgeId, {
        tier: r.tier,
        awardedAt: r.awardedAt ? new Date(r.awardedAt).toISOString() : new Date().toISOString(),
        unlockedToastSeen: r.unlockedToastSeen,
        credentialId: r.credentialId ?? null,
        credentialStatus: r.credentialStatus ?? 'VALID',
        awardSource: r.awardSource ?? 'ENGINE',
      });
    });

    const allBadges = catalog.map((def) => {
      const awardedInfo = awardedMap.get(def.id);
      const isAwarded = Boolean(awardedInfo);
      const evaluator = getBadgeEvaluator(def.id);
      const evaluation = evaluator
        ? evaluator.evaluate(stats, def.threshold)
        : { isEligible: false, currentValue: 0, targetValue: def.threshold, progressPercentage: 0, progressAvailable: false };

      let status: BadgeStatus = 'LOCKED';
      if (isAwarded) status = 'EARNED';
      else if (evaluation.progressAvailable && evaluation.progressPercentage > 0) status = 'IN_PROGRESS';

      const progressAvailable = evaluation.progressAvailable && !isAwarded;
      const progressPercentage = isAwarded ? 100 : evaluation.progressAvailable ? evaluation.progressPercentage : 0;

      return {
        id: def.id,
        title: def.title,
        category: def.category,
        tier: def.tier,
        rarity: def.rarity,
        description: def.description,
        criteria: def.criteria,
        icon: def.icon,
        unit: def.unit,
        targetValue: def.threshold,
        threshold: def.threshold,
        xpReward: def.xpReward,
        awardSource: def.awardSource,
        active: def.active,
        status,
        currentValue: evaluation.currentValue,
        progressAvailable,
        progressPercentage,
        remainingToUnlock: progressAvailable ? Math.max(0, def.threshold - evaluation.currentValue) : null,
        awardedAt: awardedInfo?.awardedAt ?? null,
        awardedSource: awardedInfo?.awardSource ?? null,
        unlockedToastSeen: awardedInfo?.unlockedToastSeen ?? true,
        credentialId: awardedInfo?.credentialId ?? null,
        credentialStatus: awardedInfo?.credentialStatus ?? null,
        verificationUrl: awardedInfo?.credentialId ? buildVerificationPath(awardedInfo.credentialId) : null,
      };
    });

    const earnedBadges = allBadges.filter((b) => b.status === 'EARNED');
    const inProgressBadges = allBadges.filter((b) => b.status === 'IN_PROGRESS');
    const lockedBadges = allBadges.filter((b) => b.status === 'LOCKED');

    const unearnedMeasurable = allBadges
      .filter((b) => b.status !== 'EARNED' && b.progressAvailable)
      .sort((a, b) => b.progressPercentage - a.progressPercentage);
    const nextMilestone = unearnedMeasurable[0] || null;

    const history = historyRows.map((h) => ({
      id: h.id,
      badgeId: h.badgeId,
      title: h.title,
      category: h.category,
      xpEarned: Number(h.xpEarned),
      eventDetails: h.eventDetails,
      achievedAt: h.achievedAt ? new Date(h.achievedAt).toISOString() : new Date().toISOString(),
    }));

    const categorySummary = (['CAREER_EXCELLENCE', 'INNOVATION', 'CONSISTENCY', 'PROFESSIONAL_DEVELOPMENT', 'MONTHLY_EXCELLENCE'] as BadgeCategory[]).map(
      (category) => {
        const inCategory = allBadges.filter((b) => b.category === category);
        return {
          category,
          total: inCategory.length,
          earned: inCategory.filter((b) => b.status === 'EARNED').length,
        };
      }
    );

    const monthlyAwards = allBadges.filter((b) => b.category === 'MONTHLY_EXCELLENCE' && b.status === 'EARNED');

    return {
      summary: {
        totalEarned: earnedBadges.length,
        totalAvailable: allBadges.length,
        completionPercentage: allBadges.length ? Math.round((earnedBadges.length / allBadges.length) * 100) : 0,
        totalXp: Math.round((xpAgg._sum.pointsAwarded || 0) * 10) / 10,
        currentStreak: stats.currentStreakDays,
        longestStreak: stats.longestStreakDays,
        totalActiveDays: stats.totalActiveDays,
        activeWeeksInMonth: stats.activeWeeksInMonth,
      },
      nextMilestone,
      stats,
      categories: categorySummary,
      monthlyAwards,
      badges: {
        all: allBadges,
        earned: earnedBadges,
        inProgress: inProgressBadges,
        locked: lockedBadges,
      },
      history,
    };
  }

  /** Marks unlock celebratory toasts as acknowledged so they do not repeat. */
  async acknowledgeBadgeToast(studentId: string, badgeId: string) {
    await prisma.$executeRawUnsafe(
      `UPDATE student_badges SET "unlockedToastSeen" = TRUE WHERE "studentId" = $1 AND "badgeId" = $2`,
      studentId,
      badgeId
    );
    return { success: true };
  }

  /**
   * Public, privacy-safe credential verification. Returns only non-sensitive
   * achievement metadata — never emails, applications, documents or internal
   * performance records.
   */
  async verifyCredential(credentialId: string): Promise<{
    found: boolean;
    credential?: {
      credentialId: string;
      badgeTitle: string;
      category: string;
      tier: string;
      description: string;
      criteria: string;
      icon: string;
      issuingOrganization: string;
      issuedAt: string;
      holder: string;
      status: 'VALID' | 'REVOKED';
      revokedReason?: string;
      awardSource: string;
    };
  }> {
    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{
          badgeId: string;
          title: string;
          category: string;
          tier: string;
          description: string;
          awardedAt: Date;
          credentialStatus: string | null;
          revokedReason: string | null;
          awardSource: string | null;
          studentName: string | null;
        }>
      >(
        `SELECT sb."badgeId", sb.title, sb.category, sb.tier, sb.description, sb."awardedAt",
                sb."credentialStatus", sb."revokedReason", sb."awardSource", u.name AS "studentName"
         FROM student_badges sb
         JOIN users u ON u.id = sb."studentId"
         WHERE sb."credentialId" = $1
         LIMIT 1`,
        credentialId
      );
      if (!rows.length) return { found: false };

      const row = rows[0];
      const catalogDef = BADGE_CATALOG.find((b) => b.id === row.badgeId);
      const status = (row.credentialStatus as 'VALID' | 'REVOKED') || 'VALID';

      return {
        found: true,
        credential: {
          credentialId,
          badgeTitle: row.title,
          category: row.category,
          tier: row.tier,
          description: row.description,
          criteria: catalogDef?.criteria ?? '',
          icon: catalogDef?.icon ?? 'Award',
          issuingOrganization: ISSUING_ORGANIZATION,
          issuedAt: row.awardedAt ? new Date(row.awardedAt).toISOString() : new Date().toISOString(),
          holder: this.maskName(row.studentName),
          status,
          revokedReason: status === 'REVOKED' ? row.revokedReason ?? undefined : undefined,
          awardSource: row.awardSource ?? 'ENGINE',
        },
      };
    } catch {
      return { found: false };
    }
  }

  /** Privacy-safe display name: first name + last initial. */
  private maskName(name: string | null | undefined): string {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'A verified student';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  }

  /** All credentials a student has earned (for the gallery / export). */
  async listStudentCredentials(studentId: string) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        badgeId: string;
        title: string;
        category: string;
        tier: string;
        awardedAt: Date;
        credentialId: string | null;
        credentialStatus: string | null;
      }>
    >(
      `SELECT "badgeId", title, category, tier, "awardedAt", "credentialId", "credentialStatus"
       FROM student_badges
       WHERE "studentId" = $1
       ORDER BY "awardedAt" DESC`,
      studentId
    );
    return rows.map((r) => ({
      badgeId: r.badgeId,
      title: r.title,
      category: r.category,
      tier: r.tier,
      issuedAt: r.awardedAt ? new Date(r.awardedAt).toISOString() : null,
      credentialId: r.credentialId,
      status: r.credentialStatus ?? 'VALID',
      verificationUrl: r.credentialId ? buildVerificationPath(r.credentialId) : null,
    }));
  }
}

export const badgeEngine = new BadgeEngine();

export const recordDailyActivity = badgeEngine.recordDailyActivity.bind(badgeEngine);
export const calculateStreak = badgeEngine.calculateStreak.bind(badgeEngine);
export const evaluateAndAwardBadges = badgeEngine.evaluateAndAwardBadges.bind(badgeEngine);
export const getStudentBadgesOverview = badgeEngine.getStudentBadgesOverview.bind(badgeEngine);
export const acknowledgeBadgeToast = badgeEngine.acknowledgeBadgeToast.bind(badgeEngine);
export type { BadgeDefinition };
