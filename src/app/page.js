import { db } from "../lib/db";
import { semestres } from "../db/schema";
import { desc } from "drizzle-orm";

const Home = async () => {
  const allSemesters = await db
    .select()
    .from(semestres)
    .orderBy(desc(semestres.año), desc(semestres.numero));
  return (
    <nav className="navbar">
      <div className="links">
        {allSemesters.map((semester) => (
          <button key={semester.id} className="semester-box">
            {semester.numero}er Semestre
          </button>
        ))}
        <button className="semester-box">Insertar nuevo semestre</button>
      </div>
    </nav>
  );
};

export default Home;
