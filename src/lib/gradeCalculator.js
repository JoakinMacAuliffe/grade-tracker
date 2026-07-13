/**
 * Pure grade calculation utility — no DB calls, runs on client or server.
 *
 * Chilean grading scale: 1.0 – 7.0
 * Exam rule: if NP (Nota de Presentación) ≤ exemptionGrade (default 5.0),
 *   Final = 0.70 × NP + 0.30 × examGrade
 * Otherwise: Final = NP (student is exempt)
 */

/**
 * @param {Object} opts
 * @param {Array}  opts.standaloneEvals  – evaluations with own weight (groupId = null)
 * @param {Array}  opts.groups           – evaluationGroups, each with .evaluations[]
 * @param {number|string|null} opts.examGrade
 * @param {number|string} opts.exemptionGrade  – threshold below which exam is required (default 5.0)
 *
 * @returns {{
 *   currentNp: number,      // accumulated NP from completed evaluations
 *   maxPossibleNp: number,  // best-case NP if all remaining evals score 7.0
 *   needsExam: boolean,     // true when currentNp ≤ exemptionGrade
 *   finalGrade: number|null,// set when allComplete (+ exam graded if needed)
 *   completedWeight: number,// fraction of total weight that has been graded
 *   totalWeight: number,    // sum of all weights in the course
 *   allComplete: boolean,   // true when every evaluation has a grade
 * }}
 */
export function calculateCourseGrade({
  standaloneEvals = [],
  groups = [],
  examGrade = null,
  exemptionGrade = 5.0,
}) {
  let currentNp = 0;
  let maxPossibleNp = 0;
  let completedWeight = 0;
  let totalWeight = 0;

  const hasGrade = (g) => g !== null && g !== undefined && g !== "";

  // ── Standalone evaluations ────────────────────────────────────
  for (const ev of standaloneEvals) {
    const w = parseFloat(ev.weight);
    totalWeight += w;

    if (hasGrade(ev.grade)) {
      const g = parseFloat(ev.grade);
      currentNp += w * g;
      maxPossibleNp += w * g; // already graded — max = actual
      completedWeight += w;
    } else {
      maxPossibleNp += w * 7.0; // best case: score 7.0
    }
  }

  // ── Grouped evaluations ───────────────────────────────────────
  for (const group of groups) {
    const gw = parseFloat(group.totalWeight);
    totalWeight += gw;

    const items = group.evaluations || [];
    const n = items.length;

    if (n === 0) {
      maxPossibleNp += gw * 7.0;
      continue;
    }

    const completed = items.filter((ev) => hasGrade(ev.grade));
    const c = completed.length;
    const completedSum = completed.reduce((s, ev) => s + parseFloat(ev.grade), 0);

    if (c > 0) {
      // Proportional contribution based on items graded so far
      currentNp += gw * (c / n) * (completedSum / c);
      completedWeight += gw * (c / n);
      // Max: assume remaining items all score 7.0
      maxPossibleNp += gw * ((completedSum + 7.0 * (n - c)) / n);
    } else {
      maxPossibleNp += gw * 7.0;
    }
  }

  // ── Completeness check ────────────────────────────────────────
  const allStandalone = standaloneEvals.every((ev) => hasGrade(ev.grade));
  const allGrouped = groups.every((g) => {
    const items = g.evaluations || [];
    return items.length > 0 && items.every((ev) => hasGrade(ev.grade));
  });
  const allComplete = allStandalone && allGrouped;

  // ── Round to avoid floating-point noise ──────────────────────
  const roundNp = (v) => Math.round(v * 1000) / 1000;
  const npVal = roundNp(currentNp);
  const maxVal = Math.min(roundNp(maxPossibleNp), 7.0);

  const exemption = parseFloat(exemptionGrade) || 5.0;
  const needsExam = npVal <= exemption;

  // ── Final grade (only meaningful when all evals are complete) ─
  let finalGrade = null;
  if (allComplete) {
    const examNum = hasGrade(examGrade) ? parseFloat(examGrade) : null;
    if (needsExam) {
      if (examNum !== null) {
        finalGrade = Math.round((0.7 * npVal + 0.3 * examNum) * 10) / 10;
      }
      // else: exam pending — finalGrade stays null
    } else {
      finalGrade = Math.round(npVal * 10) / 10;
    }
  }

  return {
    currentNp: npVal,
    maxPossibleNp: maxVal,
    needsExam,
    finalGrade,
    completedWeight: roundNp(completedWeight),
    totalWeight: roundNp(totalWeight),
    allComplete,
  };
}
