"use strict";
/**
 * Authoritative streak calculator — the single source of truth for
 * consecutive-day career activity streaks.
 *
 * All functions here are PURE (no database / no timezone lookups at call time).
 * Callers pass the already-resolved `today`/`yesterday` date strings so that the
 * Asia/Kolkata day boundaries are computed once, on the server, and never
 * re-derived on the client.
 *
 * STRICT RULES (no grace period, no carry-forward):
 *  - A fully missed calendar day BREAKS the chain. The current streak resets to 0.
 *  - The chain is "live" only while the most recent activity is TODAY or
 *    YESTERDAY. A day that has not finished yet cannot be a *missed* day, so
 *    when the last activity is yesterday the streak is still shown as active
 *    until midnight passes in Asia/Kolkata.
 *  - Longest-streak history is always preserved independently of the current
 *    streak, so a reset never loses the best run.
 *  - Streak Rescue is applied OUTSIDE this calculator: it inserts a synthetic
 *    qualifying day (source = STREAK_RESCUE) which then simply makes the chain
 *    contiguous again. This calculator never "rescues" anything on its own.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREAK_MILESTONES = void 0;
exports.shiftDate = shiftDate;
exports.weekdayIndex = weekdayIndex;
exports.getWeekStartMonday = getWeekStartMonday;
exports.computeStreakCore = computeStreakCore;
exports.buildMilestoneProgress = buildMilestoneProgress;
exports.getNextStreakMilestone = getNextStreakMilestone;
exports.buildWeeklyActivity = buildWeeklyActivity;
/** Human-facing consecutive-day milestones surfaced in the dashboard. */
exports.STREAK_MILESTONES = [5, 15, 30, 50, 100, 180];
/** Shifts a YYYY-MM-DD string by `deltaDays` using pure UTC math (no TZ drift). */
function shiftDate(isoDate, deltaDays) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    return dt.toISOString().slice(0, 10);
}
/** Weekday index (0 = Sunday … 6 = Saturday) for a YYYY-MM-DD string. */
function weekdayIndex(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
/** Monday of the week containing `isoDate` (India-typical Monday-start week). */
function getWeekStartMonday(isoDate) {
    const dow = weekdayIndex(isoDate);
    const delta = dow === 0 ? -6 : 1 - dow;
    return shiftDate(isoDate, delta);
}
/**
 * Computes strict current/longest streak metrics from a list of activity dates.
 * The list is de-duplicated and sorted internally, so callers may pass raw rows.
 */
function computeStreakCore(activityDates, todayStr, yesterdayStr) {
    const uniqueDates = Array.from(new Set(activityDates)).sort().reverse();
    if (uniqueDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0, lastQualifyingDate: null };
    }
    const lastQualifyingDate = uniqueDates[0];
    const totalActiveDays = uniqueDates.length;
    // Strict gate: the most recent activity must be today or yesterday.
    // Anything older means at least one full calendar day was missed → streak 0.
    const isLive = uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr;
    let currentStreak = 0;
    if (isLive) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            // Element i must be exactly i days before the most recent activity.
            if (uniqueDates[i] === shiftDate(uniqueDates[0], -i)) {
                currentStreak++;
            }
            else {
                break;
            }
        }
    }
    // Historical longest run (independent of the current one).
    let longestStreak = currentStreak;
    let run = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
        if (shiftDate(uniqueDates[i], -1) === uniqueDates[i + 1]) {
            run++;
            if (run > longestStreak)
                longestStreak = run;
        }
        else {
            run = 1;
        }
    }
    return {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        totalActiveDays,
        lastQualifyingDate,
    };
}
/** Full milestone ladder with reached/remaining flags for the current streak. */
function buildMilestoneProgress(currentStreak) {
    return exports.STREAK_MILESTONES.map((days) => ({
        days,
        reached: currentStreak >= days,
        remaining: Math.max(0, days - currentStreak),
    }));
}
/** The next unreached milestone, or null when the final one is already met. */
function getNextStreakMilestone(currentStreak) {
    const next = exports.STREAK_MILESTONES.find((m) => currentStreak < m);
    if (!next)
        return null;
    return { days: next, remaining: next - currentStreak };
}
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/**
 * Builds the Monday→Sunday activity strip for the week containing `todayStr`.
 * Every status is derived from real activity records — nothing is fabricated.
 * Days that precede the student's very first recorded activity are marked
 * NEUTRAL (not "missed"), so a newly onboarded student is never penalised for
 * days that predate their account.
 */
function buildWeeklyActivity(activeDates, todayStr, firstActivityDate) {
    const weekStart = getWeekStartMonday(todayStr);
    const out = [];
    for (let i = 0; i < 7; i++) {
        const date = shiftDate(weekStart, i);
        const isToday = date === todayStr;
        const isFuture = date > todayStr;
        const isActive = activeDates.has(date);
        let status;
        if (isActive && isToday)
            status = 'TODAY_COMPLETED';
        else if (isActive)
            status = 'COMPLETED';
        else if (isToday)
            status = 'TODAY_PENDING';
        else if (isFuture)
            status = 'FUTURE';
        else if (firstActivityDate && date < firstActivityDate)
            status = 'NEUTRAL';
        else
            status = 'MISSED';
        out.push({
            date,
            dayLabel: WEEKDAY_LABELS[weekdayIndex(date)],
            dayNumber: Number(date.slice(8, 10)),
            isToday,
            status,
        });
    }
    return out;
}
