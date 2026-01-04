import { db } from "../lib/db";
import { semesters } from "../db/schema";
import { desc } from "drizzle-orm";
import { auth } from "../auth.js";
import { redirect } from "next/navigation";
import SemesterList from "../components/semester_list";

const Home = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const allSemesters = await db
    .select()
    .from(semesters)
    .orderBy(desc(semesters.year));

  return <SemesterList semesters={allSemesters} />;
};

export default Home;
