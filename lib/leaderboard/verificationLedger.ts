import prisma from '@/lib/prisma';
import { platformRegistry } from './adapters/adapterRegistry';
import { getAllTimePeriodKey, getPeriodKey } from './periodUtils';
import { DEFAULT_SCORING_WEIGHTS } from './types';

export interface RecordActivityInput {
  studentId: string;
  sourceType: 'CONTEST' | 'HACKATHON' | 'INTERNSHIP' | 'CONSISTENCY';
  sourcePlatform: string;
  sourceAccountId?: string;
  activityType: string;
  externalActivityId: string;
  opportunityId?: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'PENDING_REVIEW' | 'REJECTED' | 'UNAVAILABLE';
  verificationMethod?: string;
  evidenceReference?: string;
  occurredAt?: Date;
  reviewerId?: string;
  rawMetadata?: any;
}

export interface AwardPointsInput {
  studentId: string;
  verifiedActivityId: string;
  category: 'CODING' | 'HACKATHON' | 'INTERNSHIP' | 'CONSISTENCY';
  pointsAwarded: number;
  reason: string;
  periodKey?: string;
}

export class VerificationLedgerService {
  /**
   * Idempotently records an activity in verified_activities.
   * If already recorded, updates status/metadata safely without duplicating.
   */
  async recordActivity(input: RecordActivityInput) {
    const verifiedAt = input.verificationStatus === 'VERIFIED' ? new Date() : null;

    // Use Prisma upsert with unique composite key
    const activity = await prisma.verifiedActivity.upsert({
      where: {
        studentId_sourceType_sourcePlatform_externalActivityId_activityType: {
          studentId: input.studentId,
          sourceType: input.sourceType,
          sourcePlatform: input.sourcePlatform,
          externalActivityId: input.externalActivityId,
          activityType: input.activityType,
        },
      },
      update: {
        verificationStatus: input.verificationStatus,
        verificationMethod: input.verificationMethod,
        evidenceReference: input.evidenceReference,
        verifiedAt: verifiedAt || undefined,
        lastSyncedAt: new Date(),
        reviewerId: input.reviewerId || undefined,
        rawMetadata: input.rawMetadata,
      },
      create: {
        studentId: input.studentId,
        sourceType: input.sourceType,
        sourcePlatform: input.sourcePlatform,
        sourceAccountId: input.sourceAccountId,
        activityType: input.activityType,
        externalActivityId: input.externalActivityId,
        opportunityId: input.opportunityId,
        verificationStatus: input.verificationStatus,
        verificationMethod: input.verificationMethod,
        evidenceReference: input.evidenceReference,
        verifiedAt,
        occurredAt: input.occurredAt || new Date(),
        lastSyncedAt: new Date(),
        reviewerId: input.reviewerId,
        rawMetadata: input.rawMetadata,
      },
    });

    return activity;
  }

  /**
   * Idempotently awards points in the points_ledger for an approved/verified activity.
   * Points are awarded for ALL_TIME and for the specific occurrence periodKey.
   */
  async awardPoints(input: AwardPointsInput) {
    const periodKey = input.periodKey || getAllTimePeriodKey();

    // Verify activity exists and is VERIFIED before awarding points
    const activity = await prisma.verifiedActivity.findUnique({
      where: { id: input.verifiedActivityId },
    });

    if (!activity || activity.verificationStatus !== 'VERIFIED') {
      return null;
    }

    try {
      const entry = await prisma.pointsLedger.upsert({
        where: {
          studentId_verifiedActivityId_periodKey: {
            studentId: input.studentId,
            verifiedActivityId: input.verifiedActivityId,
            periodKey,
          },
        },
        update: {
          pointsAwarded: input.pointsAwarded,
          reason: input.reason,
          scoringRuleVersion: DEFAULT_SCORING_WEIGHTS.ruleVersion,
        },
        create: {
          studentId: input.studentId,
          verifiedActivityId: input.verifiedActivityId,
          category: input.category,
          pointsAwarded: input.pointsAwarded,
          scoringRuleVersion: DEFAULT_SCORING_WEIGHTS.ruleVersion,
          reason: input.reason,
          periodKey,
        },
      });

      return entry;
    } catch (err: any) {
      console.warn('Points ledger award skipped/failed:', err?.message);
      return null;
    }
  }

  /**
   * Synchronizes all verified sources for a given student:
   * 1. Contest platforms (Codeforces, LeetCode, CodeChef, Codolio)
   * 2. Hackathons from OpportunityRegistration
   * 3. Internships & Applications
   * 4. Consistency metrics
   */
  async syncStudentActivities(studentId: string): Promise<{
    success: boolean;
    syncedPlatforms: string[];
    recordsCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    const syncedPlatforms: string[] = [];
    let recordsCount = 0;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        verifiedProfiles: true,
      },
    });

    if (!student) {
      return { success: false, syncedPlatforms: [], recordsCount: 0, errors: ['Student not found'] };
    }

    const profile = student.profile;
    const verifiedProfiles = student.verifiedProfiles || [];

    // -------------------------------------------------------------
    // 1. SYNC CONTEST PLATFORMS
    // -------------------------------------------------------------
    const platformsToCheck = [
      {
        platform: 'CODEFORCES',
        url: (profile as any)?.codeforcesUrl || verifiedProfiles.find((p) => p.platform === 'CODEFORCES')?.profileUrl,
        username: verifiedProfiles.find((p) => p.platform === 'CODEFORCES')?.username,
      },
      {
        platform: 'LEETCODE',
        url: profile?.leetcodeUrl || verifiedProfiles.find((p) => p.platform === 'LEETCODE')?.profileUrl,
        username: verifiedProfiles.find((p) => p.platform === 'LEETCODE')?.username,
      },
      {
        platform: 'CODECHEF',
        url: profile?.codechefUrl || verifiedProfiles.find((p) => p.platform === 'CODECHEF')?.profileUrl,
        username: verifiedProfiles.find((p) => p.platform === 'CODECHEF')?.username,
      },
      {
        platform: 'CODOLIO',
        url: profile?.codolioUrl || verifiedProfiles.find((p) => p.platform === 'CODOLIO')?.profileUrl,
        username: verifiedProfiles.find((p) => p.platform === 'CODOLIO')?.username,
      },
    ];

    for (const item of platformsToCheck) {
      const adapter = platformRegistry.getAdapter(item.platform);
      if (!adapter) continue;

      let username = item.username;
      if (!username && item.url) {
        username = adapter.parseUsernameFromUrl(item.url) || undefined;
      }

      if (!username) continue;

      const lastAttemptAt = new Date();
      try {
        const stats = await adapter.fetchUserStats(username);

        if (stats.verified) {
          syncedPlatforms.push(item.platform);

          // Update verified_profiles table
          await prisma.verifiedProfile.upsert({
            where: {
              studentId_platform: {
                studentId,
                platform: item.platform,
              },
            },
            update: {
              profileUrl: stats.profileUrl,
              username: stats.username,
              verificationStatus: 'VERIFIED',
              verifiedAt: new Date(),
              publicMetadata: stats as any,
            },
            create: {
              studentId,
              platform: item.platform,
              profileUrl: stats.profileUrl,
              username: stats.username,
              verificationStatus: 'VERIFIED',
              publicMetadata: stats as any,
            },
          });

          // Record Contest Rating Activity
          if (stats.rating && stats.rating > 0) {
            const ratingAct = await this.recordActivity({
              studentId,
              sourceType: 'CONTEST',
              sourcePlatform: item.platform,
              sourceAccountId: stats.username,
              activityType: 'RATING_ACHIEVEMENT',
              externalActivityId: `${item.platform.toLowerCase()}-rating-${stats.rating}`,
              verificationStatus: 'VERIFIED',
              verificationMethod: 'OFFICIAL_API',
              evidenceReference: stats.profileUrl,
              occurredAt: stats.retrievedAt,
              rawMetadata: { rating: stats.rating, maxRating: stats.maxRating, rankTier: stats.rankTier },
            });
            recordsCount++;
          }

          // Record Problems Solved Activity
          if (stats.problemsSolved && stats.problemsSolved > 0) {
            await this.recordActivity({
              studentId,
              sourceType: 'CONTEST',
              sourcePlatform: item.platform,
              sourceAccountId: stats.username,
              activityType: 'PROBLEMS_SOLVED',
              externalActivityId: `${item.platform.toLowerCase()}-solved-${stats.problemsSolved}`,
              verificationStatus: 'VERIFIED',
              verificationMethod: 'OFFICIAL_API',
              evidenceReference: stats.profileUrl,
              occurredAt: stats.retrievedAt,
              rawMetadata: { problemsSolved: stats.problemsSolved },
            });
            recordsCount++;
          }

          // Record Individual Attended Contests
          if (Array.isArray(stats.contestHistory)) {
            for (const contest of stats.contestHistory.slice(0, 30)) {
              await this.recordActivity({
                studentId,
                sourceType: 'CONTEST',
                sourcePlatform: item.platform,
                sourceAccountId: stats.username,
                activityType: 'CONTEST_PARTICIPATION',
                externalActivityId: `${item.platform.toLowerCase()}-contest-${contest.contestId}`,
                verificationStatus: 'VERIFIED',
                verificationMethod: 'OFFICIAL_API',
                evidenceReference: stats.profileUrl,
                occurredAt: contest.date,
                rawMetadata: contest,
              });
              recordsCount++;
            }
          }

          // Log sync history
          await prisma.syncHistory.create({
            data: {
              studentId,
              sourcePlatform: item.platform,
              status: 'SUCCESS',
              lastAttemptAt,
              lastSuccessfulSyncAt: new Date(),
              recordsProcessed: recordsCount,
            },
          });
        } else {
          // Log sync failure
          await prisma.syncHistory.create({
            data: {
              studentId,
              sourcePlatform: item.platform,
              status: 'FAILED',
              lastAttemptAt,
              errorMessage: stats.error || 'User not verified',
            },
          });
          if (stats.error) errors.push(`${item.platform}: ${stats.error}`);
        }
      } catch (err: any) {
        errors.push(`${item.platform} sync error: ${err?.message}`);
        await prisma.syncHistory.create({
          data: {
            studentId,
            sourcePlatform: item.platform,
            status: 'FAILED',
            lastAttemptAt,
            errorMessage: err?.message,
          },
        });
      }
    }

    // -------------------------------------------------------------
    // 2. SYNC HACKATHONS & COMPETITIONS
    // -------------------------------------------------------------
    const hackathonRegistrations = await prisma.opportunityRegistration.findMany({
      where: {
        studentId,
        opportunity: {
          type: { in: ['HACKATHON', 'COMPETITION'] },
        },
      },
      include: {
        opportunity: true,
        evidences: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const reg of hackathonRegistrations) {
      const opp = reg.opportunity;
      const latestEvidence = reg.evidences?.[0];
      const isVerifiedStatus =
        reg.status === 'VERIFIED' ||
        reg.status === 'REGISTERED' ||
        reg.status === 'COMPLETED' ||
        latestEvidence?.status === 'VERIFIED';
      const isPendingReview = reg.status === 'PENDING_REVIEW' || latestEvidence?.status === 'PENDING_REVIEW';

      const verificationStatus = isVerifiedStatus
        ? 'VERIFIED'
        : isPendingReview
        ? 'PENDING_REVIEW'
        : 'PENDING';

      // Milestone A: Hackathon Registration
      await this.recordActivity({
        studentId,
        sourceType: 'HACKATHON',
        sourcePlatform: 'CAREERAI',
        sourceAccountId: reg.id,
        activityType: 'HACKATHON_REGISTRATION',
        externalActivityId: `hackathon-reg-${reg.id}`,
        opportunityId: opp.id,
        verificationStatus,
        verificationMethod: reg.verificationMethod || (latestEvidence ? 'OCR_SCREENSHOT' : 'STUDENT_CONFIRMATION'),
        evidenceReference: latestEvidence?.evidenceFileUrl || reg.confirmationEvidenceUrl || undefined,
        occurredAt: reg.registeredAt || reg.initiatedAt,
        reviewerId: latestEvidence?.reviewerId || undefined,
        rawMetadata: { title: opp.title, role: reg.role, status: reg.status },
      });
      recordsCount++;

      // Milestone B: Participation / Completion
      const outcome = (reg.outcome || '').toLowerCase();
      const isParticipated = outcome.includes('participat') || reg.status === 'COMPLETED' || reg.status === 'ONGOING';
      if (isParticipated && isVerifiedStatus) {
        await this.recordActivity({
          studentId,
          sourceType: 'HACKATHON',
          sourcePlatform: 'CAREERAI',
          sourceAccountId: reg.id,
          activityType: 'HACKATHON_PARTICIPATION',
          externalActivityId: `hackathon-part-${reg.id}`,
          opportunityId: opp.id,
          verificationStatus: 'VERIFIED',
          verificationMethod: reg.verificationMethod || 'OFFICIAL_COMPLETION',
          evidenceReference: reg.certificateUrl || undefined,
          occurredAt: reg.completedAt || reg.updatedAt,
          rawMetadata: { title: opp.title, outcome: reg.outcome },
        });
        recordsCount++;
      }

      // Milestone C: Winner / Finalist
      const isWinner = outcome.includes('winner') || outcome.includes('first') || outcome.includes('runner');
      const isFinalist = outcome.includes('finalist') || outcome.includes('top');
      if ((isWinner || isFinalist) && isVerifiedStatus) {
        await this.recordActivity({
          studentId,
          sourceType: 'HACKATHON',
          sourcePlatform: 'CAREERAI',
          sourceAccountId: reg.id,
          activityType: isWinner ? 'HACKATHON_WINNER' : 'HACKATHON_FINALIST',
          externalActivityId: `hackathon-award-${reg.id}`,
          opportunityId: opp.id,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'OFFICIAL_AWARD_CONFIRMATION',
          evidenceReference: reg.certificateUrl || undefined,
          occurredAt: reg.completedAt || reg.updatedAt,
          rawMetadata: { title: opp.title, outcome: reg.outcome },
        });
        recordsCount++;
      }
    }

    // -------------------------------------------------------------
    // 3. SYNC INTERNSHIPS & APPLICATIONS
    // -------------------------------------------------------------
    const internshipRegistrations = await prisma.opportunityRegistration.findMany({
      where: {
        studentId,
        opportunity: {
          type: { in: ['INTERNSHIP', 'JOB', 'FULL_TIME'] },
        },
      },
      include: {
        opportunity: true,
        evidences: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const reg of internshipRegistrations) {
      const opp = reg.opportunity;
      const latestEvidence = reg.evidences?.[0];
      const isVerified =
        reg.status === 'VERIFIED' ||
        reg.status === 'REGISTERED' ||
        reg.status === 'INTERVIEW' ||
        reg.status === 'SELECTED' ||
        latestEvidence?.status === 'VERIFIED';

      const verificationStatus = isVerified
        ? 'VERIFIED'
        : reg.status === 'PENDING_REVIEW'
        ? 'PENDING_REVIEW'
        : 'PENDING';

      // Milestone A: Application Confirmed
      await this.recordActivity({
        studentId,
        sourceType: 'INTERNSHIP',
        sourcePlatform: 'CAREERAI',
        sourceAccountId: reg.id,
        activityType: 'INTERNSHIP_APPLICATION',
        externalActivityId: `intern-app-${reg.id}`,
        opportunityId: opp.id,
        verificationStatus,
        verificationMethod: reg.verificationMethod || 'EXTENSION',
        evidenceReference: latestEvidence?.evidenceFileUrl || undefined,
        occurredAt: reg.appliedAt || reg.initiatedAt,
        rawMetadata: { title: opp.title, company: opp.organization, status: reg.status },
      });
      recordsCount++;

      // Milestone B: Interview Progress
      if ((reg.status === 'INTERVIEW' || reg.status === 'SHORTLISTED' || reg.status === 'SELECTED') && isVerified) {
        await this.recordActivity({
          studentId,
          sourceType: 'INTERNSHIP',
          sourcePlatform: 'CAREERAI',
          sourceAccountId: reg.id,
          activityType: 'INTERNSHIP_INTERVIEW',
          externalActivityId: `intern-interview-${reg.id}`,
          opportunityId: opp.id,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'COMPANY_CONFIRMATION',
          occurredAt: reg.updatedAt,
          rawMetadata: { title: opp.title, stage: 'Interview round' },
        });
        recordsCount++;
      }

      // Milestone C: Confirmed Offer / Selected
      if (reg.status === 'SELECTED' && isVerified) {
        await this.recordActivity({
          studentId,
          sourceType: 'INTERNSHIP',
          sourcePlatform: 'CAREERAI',
          sourceAccountId: reg.id,
          activityType: 'INTERNSHIP_OFFER',
          externalActivityId: `intern-offer-${reg.id}`,
          opportunityId: opp.id,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'OFFICIAL_OFFER_VERIFIED',
          occurredAt: reg.completedAt || reg.updatedAt,
          rawMetadata: { title: opp.title, outcome: 'Selected / Offer Extended' },
        });
        recordsCount++;
      }
    }

    // Also check direct applications in Application table
    const applications = await prisma.application.findMany({
      where: {
        userId: studentId,
        status: { in: ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'] },
      },
    });

    for (const app of applications) {
      if (app.status === 'SELECTED') {
        await this.recordActivity({
          studentId,
          sourceType: 'INTERNSHIP',
          sourcePlatform: 'CAREERAI_APPLICATION',
          sourceAccountId: app.id,
          activityType: 'INTERNSHIP_OFFER',
          externalActivityId: `app-offer-${app.id}`,
          verificationStatus: 'VERIFIED',
          verificationMethod: app.statusSource || 'COMPANY_EMAIL',
          occurredAt: app.statusUpdatedAt || app.updatedAt,
          rawMetadata: { company: app.companyName, position: app.position },
        });
        recordsCount++;
      } else if (app.status === 'INTERVIEW') {
        await this.recordActivity({
          studentId,
          sourceType: 'INTERNSHIP',
          sourcePlatform: 'CAREERAI_APPLICATION',
          sourceAccountId: app.id,
          activityType: 'INTERNSHIP_INTERVIEW',
          externalActivityId: `app-interview-${app.id}`,
          verificationStatus: 'VERIFIED',
          verificationMethod: app.statusSource || 'COMPANY_EMAIL',
          occurredAt: app.statusUpdatedAt || app.updatedAt,
          rawMetadata: { company: app.companyName, position: app.position },
        });
        recordsCount++;
      }
    }

    return {
      success: true,
      syncedPlatforms,
      recordsCount,
      errors,
    };
  }
}

export const verificationLedger = new VerificationLedgerService();
