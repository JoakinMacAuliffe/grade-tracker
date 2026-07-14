"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db.js";
import { evaluations, evaluationGroups, courses } from "../../db/schema.js";
import { eq, and, isNull } from "drizzle-orm";

// ── Helpers ────────────────────────────────────────────────────

function revalidateCourse(semesterId, courseId) {
  revalidatePath(`/semester/${semesterId}/course/${courseId}`);
}

// ── Create standalone evaluation ───────────────────────────────

export async function createStandaloneEvaluationAction(prevState, formData) {
  try {
    const courseId = parseInt(formData.get("courseId"));
    const semesterId = parseInt(formData.get("semesterId"));
    const title = formData.get("title")?.trim();
    const weightPct = parseFloat(formData.get("weight"));
    const gradeRaw = formData.get("grade");

    if (!title) return { error: "Title is required" };
    if (isNaN(weightPct) || weightPct < 0 || weightPct > 100)
      return { error: "Weight must be between 0 and 100" };

    const weight = weightPct / 100;
    const grade =
      gradeRaw && gradeRaw !== ""
        ? parseFloat(gradeRaw)
        : null;

    if (grade !== null && (grade < 1.0 || grade > 7.0))
      return { error: "Grade must be between 1.0 and 7.0" };

    await db.insert(evaluations).values({
      title,
      weight: weight.toString(),
      grade: grade !== null ? grade.toString() : null,
      groupId: null,
      courseId,
    });

    revalidateCourse(semesterId, courseId);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Create evaluation group + its sub-evaluations ──────────────

export async function createGroupAction(prevState, formData) {
  try {
    const courseId = parseInt(formData.get("courseId"));
    const semesterId = parseInt(formData.get("semesterId"));
    const name = formData.get("groupName")?.trim();
    const weightPct = parseFloat(formData.get("totalWeight"));
    const subEvalCount = parseInt(formData.get("subEvalCount")) || 0;

    if (!name) return { error: "Group name is required" };
    if (isNaN(weightPct) || weightPct <= 0 || weightPct > 100)
      return { error: "Total weight must be between 1 and 100" };
    if (subEvalCount < 1) return { error: "Add at least one item" };

    const titles = [];
    for (let i = 0; i < subEvalCount; i++) {
      const t = formData.get(`subEvalTitle_${i}`)?.trim();
      if (t) titles.push(t);
    }
    if (titles.length === 0) return { error: "Add at least one item with a title" };

    const totalWeight = (weightPct / 100).toString();

    // Insert group then its items
    const [group] = await db
      .insert(evaluationGroups)
      .values({ name, totalWeight, courseId })
      .returning({ id: evaluationGroups.id });

    await db.insert(evaluations).values(
      titles.map((title) => ({
        title,
        grade: null,
        weight: null,
        groupId: group.id,
        courseId,
      }))
    );

    revalidateCourse(semesterId, courseId);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Update evaluation grade ────────────────────────────────────

export async function updateEvaluationGradeAction(prevState, formData) {
  try {
    const evalId = parseInt(formData.get("evalId"));
    const courseId = parseInt(formData.get("courseId"));
    const semesterId = parseInt(formData.get("semesterId"));
    const gradeRaw = formData.get("grade");

    const grade =
      gradeRaw && gradeRaw !== "" ? parseFloat(gradeRaw) : null;

    if (grade !== null && (grade < 1.0 || grade > 7.0))
      return { error: "Grade must be 1.0 – 7.0" };

    await db
      .update(evaluations)
      .set({ grade: grade !== null ? grade.toString() : null })
      .where(eq(evaluations.id, evalId));

    revalidateCourse(semesterId, courseId);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Delete standalone evaluation ───────────────────────────────

export async function deleteEvaluationAction(prevState, formData) {
  try {
    const evalId = parseInt(formData.get("evalId"));
    const courseId = parseInt(formData.get("courseId"));
    const semesterId = parseInt(formData.get("semesterId"));

    await db.delete(evaluations).where(eq(evaluations.id, evalId));

    revalidateCourse(semesterId, courseId);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Delete evaluation group (cascades to its evaluations) ──────

export async function deleteGroupAction(prevState, formData) {
  try {
    const groupId = parseInt(formData.get("groupId"));
    const courseId = parseInt(formData.get("courseId"));
    const semesterId = parseInt(formData.get("semesterId"));

    await db.delete(evaluationGroups).where(eq(evaluationGroups.id, groupId));

    revalidateCourse(semesterId, courseId);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Update exam grade on the course ───────────────────────────

export async function updateExamGradeAction(prevState, formData) {
  try {
    const courseId = parseInt(formData.get("courseId"));
    const semesterId = parseInt(formData.get("semesterId"));
    const gradeRaw = formData.get("examGrade");

    const grade =
      gradeRaw && gradeRaw !== "" ? parseFloat(gradeRaw) : null;

    if (grade !== null && (grade < 1.0 || grade > 7.0))
      return { error: "Exam grade must be 1.0 – 7.0" };

    await db
      .update(courses)
      .set({ examGrade: grade !== null ? grade.toString() : null })
      .where(eq(courses.id, courseId));

    revalidateCourse(semesterId, courseId);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}
