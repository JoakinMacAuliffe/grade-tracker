import { db } from "../../../../../lib/db.js";
import { courses, evaluations, evaluationGroups } from "../../../../../db/schema.js";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { auth } from "../../../../../auth.js";
import { redirect, notFound } from "next/navigation";
import EvaluationList from "../../../../../components/evaluation_list.js";

export async function generateMetadata({ params }) {
  const { courseId } = await params;
  return { title: `Course – Grade Vault` };
}

export default async function CoursePage({ params }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { semesterId, courseId } = await params;
  const semesterIdNum = parseInt(semesterId);
  const courseIdNum = parseInt(courseId);

  // Fetch course
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseIdNum))
    .limit(1);

  if (!course) notFound();

  // Fetch standalone evaluations (no group)
  const standaloneEvals = await db
    .select()
    .from(evaluations)
    .where(and(eq(evaluations.courseId, courseIdNum), isNull(evaluations.groupId)));

  // Fetch evaluation groups
  const evalGroups = await db
    .select()
    .from(evaluationGroups)
    .where(eq(evaluationGroups.courseId, courseIdNum));

  // Fetch grouped evaluations and nest them
  const groupedEvals =
    evalGroups.length > 0
      ? await db
          .select()
          .from(evaluations)
          .where(
            and(
              eq(evaluations.courseId, courseIdNum),
              isNotNull(evaluations.groupId)
            )
          )
      : [];

  const groupsWithEvals = evalGroups.map((group) => ({
    ...group,
    evaluations: groupedEvals.filter((ev) => ev.groupId === group.id),
  }));

  return (
    <EvaluationList
      course={course}
      standaloneEvals={standaloneEvals}
      groups={groupsWithEvals}
      semesterId={semesterIdNum}
    />
  );
}