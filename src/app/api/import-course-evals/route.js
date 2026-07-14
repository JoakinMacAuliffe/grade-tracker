import { NextResponse } from "next/server";
import { db } from "../../../lib/db.js";
import { evaluations, evaluationGroups, courses, semesters } from "../../../db/schema.js";
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
  if (isNaN(n) || n < 0 || n > 100)
    return { error: `Weight ${w} must be between 0 and 100` };
  return n / 100;
}

/**
 * POST /api/import-course-evals
 *
 * Body:
 * {
 *   courseId: number,
 *   semesterId: number,
 *   evaluations: Array<StandaloneEval | GroupEval>
 * }
 *
 * StandaloneEval:
 *   { title: string, weight: number (0-100), grade?: number | null }
 *
 * GroupEval:
 *   { name: string, totalWeight: number (0-100), items: [{ title: string, grade?: number | null }] }
 *
 * Detection: if an item has an "items" array it is a group; otherwise it is standalone.
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

    // ── Validate all entries upfront ───────────────────────────────
    const standaloneRows = [];   // ready to insert into evaluations
    const groupDefs = [];        // { groupRow, items[] }
    let totalWeight = 0;

    for (let i = 0; i < evalsInput.length; i++) {
      const entry = evalsInput[i];
      const isGroup = Array.isArray(entry.items);

      if (isGroup) {
        // ── Group ──────────────────────────────────────────────────
        const prefix = `Group #${i + 1} ("${entry.name ?? "?"}")`;

        if (!entry.name || typeof entry.name !== "string" || !entry.name.trim())
          return NextResponse.json({ error: `${prefix}: "name" is required` }, { status: 400 });

        const weightResult = validateWeight(entry.totalWeight);
        if (weightResult?.error)
          return NextResponse.json({ error: `${prefix}: ${weightResult.error}` }, { status: 400 });

        if (!Array.isArray(entry.items) || entry.items.length === 0)
          return NextResponse.json({ error: `${prefix}: "items" must be a non-empty array` }, { status: 400 });

        const validatedItems = [];
        for (let j = 0; j < entry.items.length; j++) {
          const item = entry.items[j];
          const iPrefix = `${prefix} item #${j + 1} ("${item.title ?? "?"}")`;

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
            courseId,
          },
          items: validatedItems,
        });
      } else {
        // ── Standalone ─────────────────────────────────────────────
        const prefix = `Evaluation #${i + 1} ("${entry.title ?? "?"}")`;

        if (!entry.title || typeof entry.title !== "string" || !entry.title.trim())
          return NextResponse.json({ error: `${prefix}: "title" is required` }, { status: 400 });

        const weightResult = validateWeight(entry.weight);
        if (weightResult?.error)
          return NextResponse.json({ error: `${prefix}: ${weightResult.error}` }, { status: 400 });

        const gradeResult = validateGrade(entry.grade ?? null);
        if (gradeResult?.error)
          return NextResponse.json({ error: `${prefix}: ${gradeResult.error}` }, { status: 400 });

        totalWeight += weightResult;
        standaloneRows.push({
          title: entry.title.trim(),
          weight: weightResult.toString(),
          grade: gradeResult !== null ? gradeResult.toString() : null,
          groupId: null,
          courseId,
        });
      }
    }

    if (totalWeight > 1.001) {
      return NextResponse.json(
        { error: `Total weight exceeds 100% (got ${Math.round(totalWeight * 100)}%)` },
        { status: 400 }
      );
    }

    // ── Insert in a transaction ────────────────────────────────────
    let importedCount = 0;
    await db.transaction(async (tx) => {
      // Standalone evaluations
      if (standaloneRows.length > 0) {
        await tx.insert(evaluations).values(standaloneRows);
        importedCount += standaloneRows.length;
      }

      // Groups + their items
      for (const { groupRow, items } of groupDefs) {
        const [inserted] = await tx
          .insert(evaluationGroups)
          .values(groupRow)
          .returning({ id: evaluationGroups.id });

        await tx.insert(evaluations).values(
          items.map((item) => ({
            ...item,
            weight: null,   // weight is on the group, not individual items
            groupId: inserted.id,
            courseId,
          }))
        );
        importedCount += items.length;
      }
    });

    revalidatePath(`/semester/${semesterId}/course/${courseId}`);

    return NextResponse.json({ success: true, imported: importedCount });
  } catch (err) {
    console.error("[import-course-evals]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
