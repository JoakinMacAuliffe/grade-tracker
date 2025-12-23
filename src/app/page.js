import { db } from "../lib/db";
import { semestres } from "../db/schema";
import { desc } from "drizzle-orm";
import SemesterList from "../components/semester_list";

const Home = async () => {
  const allSemesters = await db
    .select()
    .from(semestres)
    .orderBy(desc(semestres.año));

  return <SemesterList semesters={allSemesters} />;
};

export default Home;
