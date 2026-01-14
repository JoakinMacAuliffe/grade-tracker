import { db } from "../lib/db";
import { semesters } from "../db/schema";
import { asc, eq } from "drizzle-orm";
import { auth } from "../auth.js";
import { redirect } from "next/navigation";
import SemesterList from "../components/semester_list";
import { getCurrentUserId } from "../lib/auth-helpers";

const Home = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = await getCurrentUserId();

  const userSemesters = await db
    .select()
    .from(semesters)
    .where(eq(semesters.userId, userId))
    .orderBy(asc(semesters.number));

  return <SemesterList semesters={userSemesters} />;
};

export default Home;
