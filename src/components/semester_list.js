"use client";

import { useState } from "react";
import styles from "./semester_list.module.css";

export default function SemesterList({ semesters }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.links}>
          <button
            className={styles.semesterBox}
            onClick={() => setIsOpen(true)}
          >
            Insertar nuevo semestre
          </button>

          {semesters.map((semester) => (
            <button key={semester.id} className={styles.semesterBox}>
              Semestre {semester.numero} - {semester.año}
            </button>
          ))}
        </div>
      </nav>

      {/* Full-screen overlay with form */}
      {isOpen && (
        <div className={styles.semesterForm}>
          <div className={styles.formContainer}>
            <h3>Nuevo Semestre</h3>
            <form>
              <label>
                Número de Semestre:
                <input type="number" name="numero" required />
              </label>
              <label>
                Año:
                <input type="number" name="año" required />
              </label>
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.submitButton}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
