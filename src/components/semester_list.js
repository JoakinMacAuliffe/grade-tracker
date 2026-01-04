"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { createSemesterAction } from "../lib/actions/semester.js";
import styles from "./semester_list.module.css";

export default function SemesterList({ semesters }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createSemesterAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Semesters</h1>
        <button className={styles.addButton} onClick={() => setIsOpen(true)}>
          + New Semester
        </button>
      </div>

      <div className={styles.semesterGrid}>
        {semesters.length === 0 ? (
          <p className={styles.emptyMessage}>No semesters registered.</p>
        ) : (
          semesters.map((semester) => (
            <div key={semester.id} className={styles.semesterCard}>
              <div className={styles.semesterNumber}>
                Semester {semester.number}
              </div>
              <div className={styles.semesterYear}>{semester.year}</div>
              {semester.startDate && semester.endDate && (
                <div className={styles.semesterDates}>
                  {new Date(semester.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(semester.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className={styles.semesterForm} onClick={() => setIsOpen(false)}>
          <div
            className={styles.formContainer}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>New Semester</h3>
            <form action={formAction}>
              <label>
                Semester Number:
                <input type="number" name="number" required min="1" />
              </label>
              <label>
                Year:
                <input
                  type="number"
                  name="year"
                  required
                  min="2000"
                  max="2100"
                />
              </label>
              <label>
                Start Date:
                <input type="date" name="startDate" />
              </label>
              <label>
                End Date:
                <input type="date" name="endDate" />
              </label>
              {state?.error && (
                <p className={styles.errorMessage}>{state.error}</p>
              )}
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
