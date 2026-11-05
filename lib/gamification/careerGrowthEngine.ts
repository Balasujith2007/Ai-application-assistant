import prisma from '@/lib/prisma';
import type { RewardTier } from './rewardConfig';
import {
  getRewardConfig,
  type RewardEngineConfig,
  type CareerGrowthConfig,
} from './rewardConfigService';

/**
 * Career Growth Engine
 * --------------------
 * Computes a student's weekly Career Growth Score from the platform's actual
 * purpose — a Student Career Growth & Opportunity Platform:
 *
 *   1. Internship & job applications  (default 35%)
 *   2. Hackathons & competitions      (default 35%)
 *   3. Resume strength                (default 30%)
 *
 * It deliberately does NOT use LMS metrics (lessons completed, course progress,
 * learning consistency, assessment scores, learning streaks). Only real platform
 * records are read: `Application`/`Interview`/`VerifiedActivity` (internship),
 * `OpportunityRegistration`/`Opportunity`/`RegistrationEvidence`/`VerifiedActivity`
 * (hackathon), and `Profile`/`Project`/`Experience`/`Skill`/`Education`/`Resume`
 * (resume).
 *
 * Anti-gaming guarantees:
 *  - Only the HIGHEST milestone reached per distinct application / registration
 *    is counted, so repeat submissions of the same item never stack.
 *  - Applying alone never earns winner-level points.
 *  - A configurable cap limits how many milestones count per week.
 *  - When a verification requirement is enabled, unverified records are excluded.
 *  - All weights, milestone scores, criteria maxima, caps and verification
 *    switches are read from the persisted (admin-editable) reward configuration.
 */

const TARGET_SKILLS = 10;
const TARGET_PROJECTS = 4;
const TARGET_EXPERIENCES = 3;
const TARGET_INTERNSHIP_EXPERIENCES = 2;
const TARGET_ACHIEVEMENTS = 5;
const TARGET_MEASURABLE = 3;

const INTERNSHIP_APPLICATION_TYPES = ['INTERNSHIP', 'JOB'];
const CAREER_OPPORTUNITY_TYPES = ['HACKATHON', 'COMPETITION'];

/** Ordered internship milestone keys (ascending value). */
const INTERNSHIP_MILESTONE_ORDER = [
  'applicationSubmitted',
  'shortlisted',
  'interviewAttended',
  'selected',
  'internshipCompleted',
] as const;

/** Ordered hackathon milestone keys (ascending value). */
const HACKATHON_MILESTONE_ORDER = [
  'applicationSubmitted',
  'registrationConfirmed',
  'participationCompleted',
  'projectSubmitted',
  'shortlisted',
  'finalist',
  'winner',
] as const;

const MILESTONE_LABELS: Record<string, string> = {
  applicationSubmitted: 'Application submitted',
  shortlisted: 'Shortlisted',
  interviewAttended: 'Interview attended',
  selected: 'Selected',
  internshipCompleted: 'Internship completed',
  registrationConfirmed: 'Registration confirmed',
  participationCompleted: 'Participation completed',
  projectSubmitted: 'Project submitted',
  finalist: 'Finalist',
  winner: 'Winner / prize recipient',
};

const RESUME_CRITERIA_LABELS: Record<keyof CareerGrowthConfig['resumeCriteria'], string> = {
  technicalSkills: 'Technical skills',
  projects: 'Projects',
  internshipExperience: 'Internship experience',
  certifications: 'Certifications',
  achievements: 'Achievements',
  professionalExperience: 'Professional experience',
  resumeCompleteness: 'Resume completeness',
  measurableAccomplishments: 'Measurable accomplishments',
  improvement: 'Improvement since last resume version',
};

/** Criteria with no backing data model on this platform. */
const UNAVAILABLE_RESUME_CRITERIA: Array<keyof CareerGrowthConfig['resumeCriteria']> = ['certifications'];

export type CareerGrowthCategoryKey = 'internshipApplications' | 'hackathonsCompetitions' | 'resumeStrength';

export interface CareerMilestoneDetail {
  key: string;
  label: string;
  points: number;
  reference: string;
  detail?: string;
}

export interface CareerCategoryScore {
  key: CareerGrowthCategoryKey;
  label: string;
  weight: number;
  /** Normalized 0-100 category score. */
  rawScore: number;
  /** rawScore * weight / 100 (contribution to the final 0-100 score). */
  weightedPoints: number;
  milestones: CareerMilestoneDetail[];
  counts: Record<string, number | boolean>;
}

export interface ResumeCriterionScore {
  key: keyof CareerGrowthConfig['resumeCriteria'];
  label: string;
  earned: number;
  max: number;
  available: boolean;
}

export interface CareerGrowthCounts {
  skills: number;
  projects: number;
  experiences: number;
  education: number;
  resumeUploaded: boolean;
}

export interface CareerGrowthResult {
  studentId: string;
  weekKey: string;
  startDate: Date;
  endDate: Date;
  finalScore: number;
  tier: RewardTier;
  categories: {
    internshipApplications: CareerCategoryScore;
    hackathonsCompetitions: CareerCategoryScore;
    resumeStrength: CareerCategoryScore;
  };
  resumeCriteria: ResumeCriterionScore[];
  counts: CareerGrowthCounts;
  unavailableCriteria: string[];
  computedAt: string;
}

/** Compact, storable form persisted to WeeklyPerformanceSnapshot.careerBreakdown. */
export interface CareerBreakdownSnapshot {
  version: number;
  finalScore: number;
  tier: RewardTier;
  categories: {
    internshipApplications: { rawScore: number; weight: number; weightedPoints: number };
    hackathonsCompetitions: { rawScore: number; weight: number; weightedPoints: number };
    resumeStrength: { rawScore: number; weight: number; weightedPoints: number };
  };
  resume: {
    counts: CareerGrowthCounts;
    criteria: ResumeCriterionScore[];
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ratioScore(current: number, target: number, max: number): number {
  if (target <= 0) return 0;
  return clamp(Math.round((current / target) * max * 100) / 100, 0, max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function containsDigit(text: string | null | undefined): boolean {
  return typeof text === 'string' && /\d/.test(text);
}

export class CareerGrowthEngine {
  /**
   * Computes the career growth score for one student across the given evaluation
   * window. `weekKey` is used only for snapshot/improvement comparison.
   */
  async computeCareerGrowthScore(
    studentId: string,
    weekKey: string,
    startDate: Date,
    endDate: Date,
    configOverride?: RewardEngineConfig
  ): Promise<CareerGrowthResult> {
    const config = configOverride ?? (await getRewardConfig());
    const cg = config.careerGrowth;

    const [internship, hackathon, resume] = await Promise.all([
      this.computeInternshipCategory(studentId, startDate, endDate, cg),
      this.computeHackathonCategory(studentId, startDate, endDate, cg),
      this.computeResumeCategory(studentId, weekKey, startDate, endDate, cg),
    ]);

    const finalScore = round2(
      clamp(
        internship.weightedPoints + hackathon.weightedPoints + resume.weightedPoints,
        0,
        100
      )
    );

    const tier = this.resolveTier(finalScore, config);

    const resumeCounts = (resume.counts as unknown as CareerGrowthCounts) ?? {
      skills: 0,
      projects: 0,
      experiences: 0,
      education: 0,
      resumeUploaded: false,
    };

    return {
      studentId,
      weekKey,
      startDate,
      endDate,
      finalScore,
      tier,
      categories: {
        internshipApplications: internship,
        hackathonsCompetitions: hackathon,
        resumeStrength: resume,
      },
      resumeCriteria: resume.criteria,
      counts: resumeCounts,
      unavailableCriteria: UNAVAILABLE_RESUME_CRITERIA.map((k) => RESUME_CRITERIA_LABELS[k]),
      computedAt: new Date().toISOString(),
    };
  }

  /** Converts a full result into the compact snapshot persisted weekly. */
  toSnapshot(result: CareerGrowthResult): CareerBreakdownSnapshot {
    return {
      version: 1,
      finalScore: result.finalScore,
      tier: result.tier,
      categories: {
        internshipApplications: {
          rawScore: result.categories.internshipApplications.rawScore,
          weight: result.categories.internshipApplications.weight,
          weightedPoints: result.categories.internshipApplications.weightedPoints,
        },
        hackathonsCompetitions: {
          rawScore: result.categories.hackathonsCompetitions.rawScore,
          weight: result.categories.hackathonsCompetitions.weight,
          weightedPoints: result.categories.hackathonsCompetitions.weightedPoints,
        },
        resumeStrength: {
          rawScore: result.categories.resumeStrength.rawScore,
          weight: result.categories.resumeStrength.weight,
          weightedPoints: result.categories.resumeStrength.weightedPoints,
        },
      },
      resume: {
        counts: result.counts,
        criteria: result.resumeCriteria,
      },
    };
  }

  // ── Internship & job applications ────────────────────────────────────────

  private async computeInternshipCategory(
    studentId: string,
    startDate: Date,
    endDate: Date,
    cg: CareerGrowthConfig
  ): Promise<CareerCategoryScore & { criteria?: ResumeCriterionScore[] }> {
    const scores = cg.internshipMilestones;

    const [applications, interviews, verifiedActivities, experiences] = await Promise.all([
      prisma.application.findMany({
        where: {
          userId: studentId,
          applicationType: { in: INTERNSHIP_APPLICATION_TYPES as never },
        },
        select: {
          id: true,
          opportunityId: true,
          companyName: true,
          position: true,
          applicationUrl: true,
          status: true,
          statusSource: true,
          appliedDate: true,
          statusUpdatedAt: true,
          updatedAt: true,
        },
      }),
      prisma.interview.findMany({
        where: { userId: studentId, date: { gte: startDate, lte: endDate } },
        select: { id: true, companyName: true, role: true, date: true },
      }),
      prisma.verifiedActivity.findMany({
        where: {
          studentId,
          verificationStatus: 'VERIFIED',
          AND: [
            {
              OR: [
                { sourceType: 'INTERNSHIP' },
                { activityType: { startsWith: 'INTERNSHIP_' } },
              ],
            },
            {
              OR: [
                { occurredAt: { gte: startDate, lte: endDate } },
                { occurredAt: null, createdAt: { gte: startDate, lte: endDate } },
              ],
            },
          ],
        },
        select: {
          id: true,
          activityType: true,
          opportunityId: true,
          externalActivityId: true,
          occurredAt: true,
          createdAt: true,
        },
      }),
      prisma.experience.findMany({
        where: { profile: { userId: studentId } },
        select: { company: true, role: true },
      }),
    ]);

    const companyNames = new Set(experiences.map((e) => (e.company || '').toLowerCase().trim()));

    // Dedup key: one scored milestone per distinct opportunity/application.
    const bestByKey = new Map<string, { milestone: string; detail: string; ref: string }>();

    const inWindow = (d: Date | null | undefined): boolean =>
      d instanceof Date && d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();

    const record = (key: string, milestone: string, ref: string, detail: string) => {
      const current = bestByKey.get(key);
      if (!current || this.milestoneValue(milestone, scores) > this.milestoneValue(current.milestone, scores)) {
        bestByKey.set(key, { milestone, detail, ref });
      }
    };

    const requireInternshipVerification = cg.verification.requireInternshipVerification;

    for (const app of applications) {
      if (requireInternshipVerification && !this.isApplicationVerified(app.statusSource)) continue;

      const when = app.statusUpdatedAt ?? app.appliedDate ?? app.updatedAt;
      if (!inWindow(when)) continue;

      const key = `app:${app.opportunityId ?? app.applicationUrl ?? `${app.companyName}|${app.position}`}`;
      const milestone = this.applicationStatusToMilestone(app.status);
      if (milestone) {
        record(key, milestone, app.id, `${app.companyName} — ${app.position}`);
      }

      // Internship completed: application reached SELECTED and the student has a
      // matching experience entry on their profile.
      if (this.applicationStatusToMilestone(app.status) === 'selected') {
        const company = (app.companyName || '').toLowerCase().trim();
        if (company && companyNames.has(company)) {
          record(key, 'internshipCompleted', app.id, `${app.companyName} — ${app.position}`);
        }
      }
    }

    for (const iv of interviews) {
      const key = `interview:${iv.companyName}|${iv.role}`;
      record(key, 'interviewAttended', iv.id, `${iv.companyName} — ${iv.role}`);
    }

    // Supplementary verified internship activities not already covered above.
    for (const act of verifiedActivities) {
      const key = `act:${act.opportunityId ?? act.externalActivityId ?? act.id}`;
      if (bestByKey.has(key) || bestByKey.has(`app:${act.opportunityId}`)) continue;
      const milestone =
        act.activityType === 'INTERNSHIP_OFFER'
          ? 'selected'
          : act.activityType === 'INTERNSHIP_INTERVIEW'
          ? 'interviewAttended'
          : act.activityType === 'INTERNSHIP_APPLICATION'
          ? 'applicationSubmitted'
          : null;
      if (milestone) record(key, milestone, act.id, 'Verified internship activity');
    }

    const cap = cg.caps.maxInternshipMilestonesPerWeek;
    const ordered = Array.from(bestByKey.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => this.milestoneValue(b.milestone, scores) - this.milestoneValue(a.milestone, scores))
      .slice(0, cap);

    const milestones: CareerMilestoneDetail[] = ordered.map((m) => ({
      key: m.milestone,
      label: MILESTONE_LABELS[m.milestone] ?? m.milestone,
      points: this.milestoneValue(m.milestone, scores),
      reference: m.ref,
      detail: m.detail,
    }));

    const rawScore = clamp(
      round2(ordered.reduce((acc, m) => acc + this.milestoneValue(m.milestone, scores), 0)),
      0,
      100
    );

    return {
      key: 'internshipApplications',
      label: 'Internship & job applications',
      weight: cg.weights.internshipApplications,
      rawScore,
      weightedPoints: round2((rawScore * cg.weights.internshipApplications) / 100),
      milestones,
      counts: {
        applications: ordered.length,
        interviews: interviews.length,
      },
    };
  }

  // ── Hackathons & competitions ────────────────────────────────────────────

  private async computeHackathonCategory(
    studentId: string,
    startDate: Date,
    endDate: Date,
    cg: CareerGrowthConfig
  ): Promise<CareerCategoryScore & { criteria?: ResumeCriterionScore[] }> {
    const scores = cg.hackathonMilestones;

    const [registrations, verifiedActivities] = await Promise.all([
      prisma.opportunityRegistration.findMany({
        where: {
          studentId,
          opportunity: { type: { in: CAREER_OPPORTUNITY_TYPES as never } },
        },
        include: {
          opportunity: { select: { id: true, title: true, type: true } },
          evidences: { select: { status: true, reviewDecision: true, isAuthentic: true } },
        },
      }),
      prisma.verifiedActivity.findMany({
        where: {
          studentId,
          verificationStatus: 'VERIFIED',
          OR: [
            { sourceType: 'HACKATHON' },
            { activityType: { startsWith: 'HACKATHON_' } },
          ],
        },
        select: {
          id: true,
          activityType: true,
          opportunityId: true,
          externalActivityId: true,
          occurredAt: true,
          createdAt: true,
        },
      }),
    ]);

    const inWindow = (d: Date | null | undefined): boolean =>
      d instanceof Date && d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();

    const bestByKey = new Map<string, { milestone: string; detail: string; ref: string }>();
    const record = (key: string, milestone: string, ref: string, detail: string) => {
      const current = bestByKey.get(key);
      if (!current || this.milestoneValue(milestone, scores) > this.milestoneValue(current.milestone, scores)) {
        bestByKey.set(key, { milestone, detail, ref });
      }
    };

    const requireVerification = cg.verification.requireHackathonVerification;

    for (const reg of registrations) {
      const verified = this.isRegistrationVerified(reg);
      if (requireVerification && !verified) continue;

      const when = reg.completedAt ?? reg.verifiedAt ?? reg.registeredAt ?? reg.appliedAt ?? reg.updatedAt;
      if (!inWindow(when)) continue;

      const key = `reg:${reg.opportunityId}`;
      const milestone = this.registrationToMilestone(reg.status, reg.outcome);
      if (milestone) {
        record(key, milestone, reg.id, reg.opportunity?.title ?? 'Competition');
      }
    }

    for (const act of verifiedActivities) {
      const when = act.occurredAt ?? act.createdAt;
      if (!inWindow(when)) continue;
      const key = `act:${act.opportunityId ?? act.externalActivityId ?? act.id}`;
      if (act.opportunityId && bestByKey.has(`reg:${act.opportunityId}`)) continue;
      const milestone =
        act.activityType === 'HACKATHON_WINNER'
          ? 'winner'
          : act.activityType === 'HACKATHON_FINALIST'
          ? 'finalist'
          : act.activityType === 'HACKATHON_PARTICIPATION'
          ? 'participationCompleted'
          : act.activityType === 'HACKATHON_REGISTRATION'
          ? 'registrationConfirmed'
          : null;
      if (milestone) record(key, milestone, act.id, 'Verified competition activity');
    }

    const cap = cg.caps.maxHackathonMilestonesPerWeek;
    const ordered = Array.from(bestByKey.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => this.milestoneValue(b.milestone, scores) - this.milestoneValue(a.milestone, scores))
      .slice(0, cap);

    const milestones: CareerMilestoneDetail[] = ordered.map((m) => ({
      key: m.milestone,
      label: MILESTONE_LABELS[m.milestone] ?? m.milestone,
      points: this.milestoneValue(m.milestone, scores),
      reference: m.ref,
      detail: m.detail,
    }));

    const rawScore = clamp(
      round2(ordered.reduce((acc, m) => acc + this.milestoneValue(m.milestone, scores), 0)),
      0,
      100
    );

    return {
      key: 'hackathonsCompetitions',
      label: 'Hackathons & competitions',
      weight: cg.weights.hackathonsCompetitions,
      rawScore,
      weightedPoints: round2((rawScore * cg.weights.hackathonsCompetitions) / 100),
      milestones,
      counts: {
        registrations: registrations.length,
        scored: ordered.length,
      },
    };
  }

  // ── Resume strength ──────────────────────────────────────────────────────

  private async computeResumeCategory(
    studentId: string,
    weekKey: string,
    startDate: Date,
    endDate: Date,
    cg: CareerGrowthConfig
  ): Promise<CareerCategoryScore & { criteria: ResumeCriterionScore[]; counts: CareerGrowthCounts }> {
    const criteria = cg.resumeCriteria;

    const [profile, skills, projects, experiences, education, resumes, badgeCount, outcomeCount, prevSnapshot] =
      await Promise.all([
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
          },
        }),
        prisma.profileSkill.count({ where: { profile: { userId: studentId } } }),
        prisma.project.findMany({
          where: { profile: { userId: studentId } },
          select: { title: true, description: true },
        }),
        prisma.experience.findMany({
          where: { profile: { userId: studentId } },
          select: { role: true, description: true, currentlyWorking: true },
        }),
        prisma.education.count({ where: { profile: { userId: studentId } } }),
        prisma.resume.findMany({
          where: { userId: studentId },
          select: { uploadedAt: true, reviewStatus: true, reviewedAt: true, isActive: true },
        }),
        prisma.studentBadge.count({ where: { studentId } }),
        prisma.verifiedActivity.count({
          where: {
            studentId,
            verificationStatus: 'VERIFIED',
            activityType: { in: ['HACKATHON_WINNER', 'HACKATHON_FINALIST', 'INTERNSHIP_OFFER'] },
          },
        }),
        prisma.weeklyPerformanceSnapshot.findFirst({
          where: { studentId, weekKey: { lt: weekKey } },
          orderBy: { weekKey: 'desc' },
          select: { careerBreakdown: true },
        }),
      ]);

    const projectCount = projects.length;
    const experienceCount = experiences.length;
    const internshipExperienceCount = experiences.filter(
      (e) => /intern/i.test(e.role || '') || /intern/i.test(e.description || '')
    ).length;

    const measurableCount =
      projects.filter((p) => containsDigit(p.description)).length +
      experiences.filter((e) => containsDigit(e.description)).length;

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
      education > 0,
      skills > 0,
      projectCount > 0,
    ];
    const completenessRatio = completenessItems.filter(Boolean).length / completenessItems.length;

    const activeResume = resumes.find((r) => r.isActive) ?? resumes[0];
    const resumeReviewed = Boolean(activeResume?.reviewStatus === 'REVIEWED');
    // When resume review verification is required, improvement credit only applies
    // once a mentor has actually reviewed the resume.
    const improvementEligible = !cg.verification.requireResumeReview || resumeReviewed;

    // Improvement is derived from platform-tracked signals only: additions to the
    // student's skill and project counts since the previous week's snapshot, plus
    // a new resume upload or completed mentor review inside the window.
    const prevCounts = this.readPreviousCounts(prevSnapshot?.careerBreakdown);
    const skillDelta = Math.max(0, skills - prevCounts.skills);
    const projectDelta = Math.max(0, projectCount - prevCounts.projects);
    const newResumeInWindow = resumes.some(
      (r) => r.uploadedAt instanceof Date && r.uploadedAt >= startDate && r.uploadedAt <= endDate
    );
    const reviewInWindow = resumes.some(
      (r) => r.reviewedAt instanceof Date && r.reviewedAt >= startDate && r.reviewedAt <= endDate
    );
    const improvementSignal =
      clamp(skillDelta, 0, 2) * 0.5 +
      clamp(projectDelta, 0, 1) * 1 +
      (improvementEligible && newResumeInWindow ? 0.5 : 0) +
      (improvementEligible && reviewInWindow ? 0.5 : 0);

    const earned: Record<keyof CareerGrowthConfig['resumeCriteria'], number> = {
      technicalSkills: ratioScore(skills, TARGET_SKILLS, criteria.technicalSkills),
      projects: ratioScore(projectCount, TARGET_PROJECTS, criteria.projects),
      internshipExperience: ratioScore(internshipExperienceCount, TARGET_INTERNSHIP_EXPERIENCES, criteria.internshipExperience),
      certifications: 0,
      achievements: ratioScore(badgeCount + outcomeCount, TARGET_ACHIEVEMENTS, criteria.achievements),
      professionalExperience: ratioScore(experienceCount, TARGET_EXPERIENCES, criteria.professionalExperience),
      resumeCompleteness: round2(completenessRatio * criteria.resumeCompleteness),
      measurableAccomplishments: ratioScore(measurableCount, TARGET_MEASURABLE, criteria.measurableAccomplishments),
      improvement: clamp(round2(improvementSignal), 0, criteria.improvement),
    };

    const criteriaScores: ResumeCriterionScore[] = (
      Object.keys(criteria) as Array<keyof CareerGrowthConfig['resumeCriteria']>
    ).map((key) => ({
      key,
      label: RESUME_CRITERIA_LABELS[key],
      earned: round2(clamp(earned[key], 0, criteria[key])),
      max: criteria[key],
      available: !UNAVAILABLE_RESUME_CRITERIA.includes(key),
    }));

    const rawScore = clamp(round2(criteriaScores.reduce((acc, c) => acc + c.earned, 0)), 0, 100);

    return {
      key: 'resumeStrength',
      label: 'Resume strength',
      weight: cg.weights.resumeStrength,
      rawScore,
      weightedPoints: round2((rawScore * cg.weights.resumeStrength) / 100),
      milestones: criteriaScores
        .filter((c) => c.available && c.earned > 0)
        .map((c) => ({
          key: c.key,
          label: c.label,
          points: c.earned,
          reference: 'profile',
          detail: `${c.earned} / ${c.max}`,
        })),
      counts: {
        skills,
        projects: projectCount,
        experiences: experienceCount,
        education,
        resumeUploaded: resumes.length > 0,
      },
      criteria: criteriaScores,
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private readPreviousCounts(raw: unknown): { skills: number; projects: number } {
    const fallback = { skills: 0, projects: 0 };
    if (!raw || typeof raw !== 'object') return fallback;
    const resume = (raw as { resume?: { counts?: { skills?: number; projects?: number } } }).resume;
    const counts = resume?.counts;
    if (!counts) return fallback;
    return {
      skills: typeof counts.skills === 'number' ? counts.skills : 0,
      projects: typeof counts.projects === 'number' ? counts.projects : 0,
    };
  }

  private milestoneValue(milestone: string, scores: unknown): number {
    const value = (scores as Record<string, number | undefined>)[milestone];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  /**
   * An application counts as verified when its status came from a trusted
   * source (company email, extension sync or the system) rather than a purely
   * manual entry. Only enforced when the admin enables the requirement.
   */
  private isApplicationVerified(statusSource: string | null | undefined): boolean {
    const source = (statusSource ?? '').toUpperCase();
    return source === 'COMPANY_EMAIL' || source === 'EXTENSION' || source === 'SYSTEM';
  }

  private applicationStatusToMilestone(status: string): string | null {
    switch (status) {
      case 'APPLIED':
      case 'UNDER_REVIEW':
      case 'REJECTED':
        return 'applicationSubmitted';
      case 'SHORTLISTED':
        return 'shortlisted';
      case 'INTERVIEW':
        return 'interviewAttended';
      case 'SELECTED':
        return 'selected';
      default:
        return null; // SAVED, INITIATED, WITHDRAWN, DISQUALIFIED
    }
  }

  private registrationToMilestone(status: string, outcome: string | null): string | null {
    // Outcome (when present) is authoritative and never lower than the status.
    const outcomeMilestone = this.outcomeToMilestone(outcome);
    const statusMilestone = (() => {
      switch (status) {
        case 'INITIATED':
          return 'applicationSubmitted';
        case 'STUDENT_CONFIRMED':
        case 'PENDING_VERIFICATION':
        case 'PROOF_SUBMITTED':
        case 'VERIFYING':
        case 'PENDING_REVIEW':
        case 'VERIFIED':
        case 'REGISTERED':
        case 'REJECTED':
        case 'DISQUALIFIED':
        case 'WITHDRAWN':
        case 'FAILED':
        case 'CANCELLED':
          return 'registrationConfirmed';
        case 'IN_PROGRESS':
        case 'ONGOING':
        case 'COMPLETED':
          return 'participationCompleted';
        case 'UNDER_REVIEW':
        case 'SHORTLISTED':
        case 'INTERVIEW':
          return 'shortlisted';
        case 'SELECTED':
          return 'finalist';
        default:
          return null; // STARTED
      }
    })();

    if (!outcomeMilestone) return statusMilestone;
    if (!statusMilestone) return outcomeMilestone;
    const order = [...HACKATHON_MILESTONE_ORDER] as string[];
    return order.indexOf(outcomeMilestone) >= order.indexOf(statusMilestone) ? outcomeMilestone : statusMilestone;
  }

  private outcomeToMilestone(outcome: string | null): string | null {
    if (!outcome) return null;
    const normalized = outcome.toLowerCase();
    if (normalized.includes('win') || normalized.includes('prize') || normalized.includes('1st')) return 'winner';
    if (normalized.includes('final')) return 'finalist';
    if (normalized.includes('shortlist') || normalized.includes('select')) return 'shortlisted';
    if (normalized.includes('participat') || normalized.includes('complete')) return 'participationCompleted';
    if (normalized.includes('submit')) return 'projectSubmitted';
    return null;
  }

  private isRegistrationVerified(reg: {
    status: string;
    verificationMethod?: string | null;
    verifiedAt?: Date | null;
    confirmedAt?: Date | null;
    evidences?: Array<{ status: string; reviewDecision: string | null; isAuthentic: boolean }>;
  }): boolean {
    if (['VERIFIED', 'REGISTERED', 'COMPLETED', 'SHORTLISTED', 'SELECTED', 'INTERVIEW'].includes(reg.status)) return true;
    if (reg.verificationMethod) return true;
    if (reg.verifiedAt || reg.confirmedAt) return true;
    return (reg.evidences ?? []).some(
      (e) => e.status === 'VERIFIED' || e.reviewDecision === 'APPROVED' || e.isAuthentic
    );
  }

  private resolveTier(score: number, config: RewardEngineConfig): RewardTier {
    const t = config.tierThresholds;
    if (score >= t.legendary.min) return 'LEGENDARY';
    if (score >= t.epic.min) return 'EPIC';
    if (score >= t.rare.min) return 'RARE';
    if (score >= t.common.min) return 'COMMON';
    return 'COMEBACK';
  }
}

export const careerGrowthEngine = new CareerGrowthEngine();
