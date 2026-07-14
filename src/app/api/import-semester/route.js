import { NextResponse } from "next/server";
import { db } from "../../../lib/db.js";
import { courses, evaluations, evaluationGroups, semesters } from "../../../db/schema.js";
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
 *       code: string,            // 8 chars max, e.g. "CBM-1000"
 *       title: string,
 *       credits: number,
 *       exemptionGrade?: number, // default 5.0
 *       examGrade?: number | null,
 *       evaluations?: Array<StandaloneEval | GroupEval>
 *     }
 *   ]
 * }
 *
 * StandaloneEval: { title, weight (0-100), grade? }
 * GroupEval:      { name, totalWeight (0-100), items: [{ title, grade? }] }
 * Detection: if entry has "items" array → group; otherwise → standalone.
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

      // ── Parse evaluations (mixed standalone + groups) ─────────────
      const standaloneEvals = [];
      const groupDefs = [];

      if (Array.isArray(c.evaluations)) {
        let totalWeight = 0;

        for (let ei = 0; ei < c.evaluations.length; ei++) {
          const entry = c.evaluations[ei];
          const isGroup = Array.isArray(entry.items);

          if (isGroup) {
            const evPrefix = `${prefix} group #${ei + 1} ("${entry.name ?? "?"}")`;

            if (!entry.name || typeof entry.name !== "string" || !entry.name.trim())
              return NextResponse.json({ error: `${evPrefix}: "name" is required` }, { status: 400 });

            const weightResult = validateWeight(entry.totalWeight);
            if (weightResult?.error)
              return NextResponse.json({ error: `${evPrefix}: ${weightResult.error}` }, { status: 400 });

            if (!Array.isArray(entry.items) || entry.items.length === 0)
              return NextResponse.json({ error: `${evPrefix}: "items" must be a non-empty array` }, { status: 400 });

            const validatedItems = [];
            for (let j = 0; j < entry.items.length; j++) {
              const item = entry.items[j];
              const iPrefix = `${evPrefix} item #${j + 1} ("${item.title ?? "?"}")`;

              if (!item.title || typeof item.title !== "string" || !item.title.trim())
                return NextResponse.json({ error: `${iPrefix}: "title" is required` }, { status: 400 });

              const gradeResult = validateGrade(item.grade ?? null);
              if (gradeResult?.error)
                return NextResponse.json({ error: `${iPrefix}: ${gradeResult.error}` }, { status: 400 });

              validatedItems.push({
                title: item.title.trim(),
                grade: gradeResult !== null ? gradeResult.toString() : null,
              });
            }

            totalWeight += weightResult;
            groupDefs.push({
              groupRow: {
                name: entry.name.trim(),
                totalWeight: weightResult.toString(),
              },
              items: validatedItems,
            });
          } else {
            const evPrefix = `${prefix} evaluation #${ei + 1} ("${entry.title ?? "?"}")`;

            if (!entry.title || typeof entry.title !== "string")
              return NextResponse.json({ error: `${evPrefix}: "title" is required` }, { status: 400 });

            const weightResult = validateWeight(entry.weight);
            if (weightResult?.error)
              return NextResponse.json({ error: `${evPrefix}: ${weightResult.error}` }, { status: 400 });

            const gradeResult = validateGrade(entry.grade ?? null);
            if (gradeResult?.error)
              return NextResponse.json({ error: `${evPrefix}: ${gradeResult.error}` }, { status: 400 });

            totalWeight += weightResult;
            standaloneEvals.push({
              title: entry.title.trim(),
              weight: weightResult.toString(),
              grade: gradeResult !== null ? gradeResult.toString() : null,
            });
          }
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
        standaloneEvals,
        groupDefs,
      });
    }

    // ── Insert sequentially ──────────────────────
    for (const { course: courseData, standaloneEvals, groupDefs } of validated) {
      const [inserted] = await db
        .insert(courses)
        .values(courseData)
        .returning({ id: courses.id });

      const courseId = inserted.id;

      // Standalone evaluations
      if (standaloneEvals.length > 0) {
        await db.insert(evaluations).values(
          standaloneEvals.map((ev) => ({ ...ev, groupId: null, courseId }))
        );
      }

      // Groups + their items
      for (const { groupRow, items } of groupDefs) {
        const [insertedGroup] = await db
          .insert(evaluationGroups)
          .values({ ...groupRow, courseId })
          .returning({ id: evaluationGroups.id });

        await db.insert(evaluations).values(
          items.map((item) => ({
            ...item,
            weight: null,
            groupId: insertedGroup.id,
            courseId,
          }))
        );
      }
    }

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
