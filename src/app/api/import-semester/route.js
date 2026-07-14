import { NextResponse } from "next/server";
import { db } from "../../../lib/db.js";
import { courses, evaluations, semesters } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { auth } from "../../../auth.js";
import { getCurrentUserId } from "../../../lib/auth-helpers.js";
import { revalidatePath } from "next/cache";

// ── Validation helpers ────────────────────────────────────────────

function validateGrade(g) {
  if (g === null || g === undefined || g === "") return null;
  const n = parseFloat(g);
  if (isNaN(n) || n < 1.0 || n > 7.0) return { error: `Grade ${g} must be between 1.0 and 7.0` };
  return n;
}

function validateWeight(w) {
  const n = parseFloat(w);
  if (isNaN(n) || n < 0 || n > 100) return { error: `Weight ${w} must be between 0 and 100` };
  return n / 100;
}

/**
 * POST /api/import-semester
 *
 * Body:
 * {
 *   semesterId: number,
 *   courses: [
 *     {
 *       code: string,           // 8 chars max, e.g. "CBM-1000"
 *       title: string,
 *       credits: number,
 *       exemptionGrade?: number, // default 5.0
 *       examGrade?: number | null,
 *       evaluations?: [
 *         {
 *           title: string,
 *           weight: number,      // 0-100 percent
 *           grade?: number | null // 1.0-7.0 or omit/null
 *         }
 *       ]
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

    const { semesterId, courses: coursesInput } = body;

    if (!semesterId || !Array.isArray(coursesInput) || coursesInput.length === 0) {
      return NextResponse.json(
        { error: "semesterId and a non-empty courses array are required" },
        { status: 400 }
      );
    }

    // Verify the semester belongs to this user
    const [semester] = await db
      .select()
      .from(semesters)
      .where(eq(semesters.id, semesterId))
      .limit(1);

    if (!semester || semester.userId !== userId) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }

    // ── Validate all courses upfront ──────────────────────────────
    const validated = [];
    for (let ci = 0; ci < coursesInput.length; ci++) {
      const c = coursesInput[ci];
      const prefix = `Course #${ci + 1} (${c.code || "??"})`;

      if (!c.code || typeof c.code !== "string" || c.code.length > 8)
        return NextResponse.json({ error: `${prefix}: "code" must be a string of max 8 chars` }, { status: 400 });

      if (!c.title || typeof c.title !== "string")
        return NextResponse.json({ error: `${prefix}: "title" is required` }, { status: 400 });

      const credits = parseInt(c.credits);
      if (isNaN(credits) || credits < 1)
        return NextResponse.json({ error: `${prefix}: "credits" must be a positive integer` }, { status: 400 });

      const exemptionGrade = c.exemptionGrade != null ? parseFloat(c.exemptionGrade) : 5.0;
      if (isNaN(exemptionGrade) || exemptionGrade < 1.0 || exemptionGrade > 7.0)
        return NextResponse.json({ error: `${prefix}: "exemptionGrade" must be 1.0–7.0` }, { status: 400 });

      const examGradeResult = validateGrade(c.examGrade ?? null);
      if (examGradeResult?.error)
        return NextResponse.json({ error: `${prefix}: ${examGradeResult.error}` }, { status: 400 });

      const evalList = [];
      if (Array.isArray(c.evaluations)) {
        let totalWeight = 0;
        for (let ei = 0; ei < c.evaluations.length; ei++) {
          const ev = c.evaluations[ei];
          const evPrefix = `${prefix} evaluation #${ei + 1} ("${ev.title ?? "?"}")`;

          if (!ev.title || typeof ev.title !== "string")
            return NextResponse.json({ error: `${evPrefix}: "title" is required` }, { status: 400 });

          const weightResult = validateWeight(ev.weight);
          if (weightResult?.error)
            return NextResponse.json({ error: `${evPrefix}: ${weightResult.error}` }, { status: 400 });

          const gradeResult = validateGrade(ev.grade ?? null);
          if (gradeResult?.error)
            return NextResponse.json({ error: `${evPrefix}: ${gradeResult.error}` }, { status: 400 });

          totalWeight += weightResult;
          evalList.push({
            title: ev.title.trim(),
            weight: weightResult.toString(),
            grade: gradeResult !== null ? gradeResult.toString() : null,
          });
        }

        if (totalWeight > 1.001) {
          return NextResponse.json(
            { error: `${prefix}: total evaluation weights exceed 100% (got ${Math.round(totalWeight * 100)}%)` },
            { status: 400 }
          );
        }
      }

      validated.push({
        course: {
          courseCode: c.code.trim().padEnd(8).slice(0, 8),
          title: c.title.trim(),
          credits,
          exemptionGrade: exemptionGrade.toString(),
          examGrade: examGradeResult !== null ? examGradeResult.toString() : null,
          semesterId,
        },
        evaluations: evalList,
      });
    }

    // ── Insert everything in one transaction ──────────────────────
    await db.transaction(async (tx) => {
      for (const { course: courseData, evaluations: evalData } of validated) {
        const [inserted] = await tx
          .insert(courses)
          .values(courseData)
          .returning({ id: courses.id });

        if (evalData.length > 0) {
          await tx.insert(evaluations).values(
            evalData.map((ev) => ({
              ...ev,
              groupId: null,
              courseId: inserted.id,
            }))
          );
        }
      }
    });

    revalidatePath(`/semester/${semesterId}`);

    return NextResponse.json({
      success: true,
      imported: validated.length,
    });
  } catch (err) {
    console.error("[import-semester]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
