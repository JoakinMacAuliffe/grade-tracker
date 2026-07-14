import { NextResponse } from "next/server";
import { db } from "../../../lib/db.js";
import { evaluations, courses, semesters } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { auth } from "../../../auth.js";
import { getCurrentUserId } from "../../../lib/auth-helpers.js";
import { revalidatePath } from "next/cache";

// ── Helpers ────────────────────────────────────────────────────────

function validateGrade(g) {
  if (g === null || g === undefined || g === "") return null;
  const n = parseFloat(g);
  if (isNaN(n) || n < 1.0 || n > 7.0)
    return { error: `Grade ${g} must be between 1.0 and 7.0` };
  return n;
}

function validateWeight(w) {
  const n = parseFloat(w);
  if (isNaN(n) || n <= 0 || n > 100)
    return { error: `Weight ${w} must be between 1 and 100` };
  return n / 100;
}

/**
 * POST /api/import-course-evals
 *
 * Body:
 * {
 *   courseId: number,
 *   semesterId: number,
 *   evaluations: [
 *     {
 *       title: string,
 *       weight: number,        // percent 1–100
 *       grade?: number | null  // 1.0–7.0 or omit for pending
 *     }
 *   ]
 * }
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getCurrentUserId();
    const body = await request.json();

    const { courseId, semesterId, evaluations: evalsInput } = body;

    if (!courseId || !semesterId || !Array.isArray(evalsInput) || evalsInput.length === 0) {
      return NextResponse.json(
        { error: "courseId, semesterId and a non-empty evaluations array are required" },
        { status: 400 }
      );
    }

    // Verify the course belongs to the user (via semester ownership)
    const [course] = await db
      .select({ id: courses.id, semesterId: courses.semesterId })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course || course.semesterId !== semesterId) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const [semester] = await db
      .select({ userId: semesters.userId })
      .from(semesters)
      .where(eq(semesters.id, semesterId))
      .limit(1);

    if (!semester || semester.userId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ── Validate all evaluations upfront ──────────────────────────
    const validated = [];
    let totalWeight = 0;

    for (let i = 0; i < evalsInput.length; i++) {
      const ev = evalsInput[i];
      const prefix = `Evaluation #${i + 1} ("${ev.title ?? "?"}")`;

      if (!ev.title || typeof ev.title !== "string" || !ev.title.trim()) {
        return NextResponse.json({ error: `${prefix}: "title" is required` }, { status: 400 });
      }

      const weightResult = validateWeight(ev.weight);
      if (weightResult?.error) {
        return NextResponse.json({ error: `${prefix}: ${weightResult.error}` }, { status: 400 });
      }

      const gradeResult = validateGrade(ev.grade ?? null);
      if (gradeResult?.error) {
        return NextResponse.json({ error: `${prefix}: ${gradeResult.error}` }, { status: 400 });
      }

      totalWeight += weightResult;
      validated.push({
        title: ev.title.trim(),
        weight: weightResult.toString(),
        grade: gradeResult !== null ? gradeResult.toString() : null,
        groupId: null,
        courseId,
      });
    }

    if (totalWeight > 1.001) {
      return NextResponse.json(
        {
          error: `Total weight of imported evaluations exceeds 100% (got ${Math.round(totalWeight * 100)}%)`,
        },
        { status: 400 }
      );
    }

    // ── Insert ─────────────────────────────────────────────────────
    await db.insert(evaluations).values(validated);

    revalidatePath(`/semester/${semesterId}/course/${courseId}`);

    return NextResponse.json({ success: true, imported: validated.length });
  } catch (err) {
    console.error("[import-course-evals]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
