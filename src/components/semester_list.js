"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { createSemesterAction } from "../lib/actions/semester.js";
import styles from "./semester_list.module.css";
import Link from "next/link";

const ORDINALS = ["", "1st", "2nd", "3rd", "4th"];

// Group semesters by year, sorted descending
function groupByYear(semesters) {
  const map = {};
  for (const s of semesters) {
    if (!map[s.year]) map[s.year] = [];
    map[s.year].push(s);
  }
  for (const year in map) {
    map[year].sort((a, b) => a.number - b.number);
  }
  return Object.entries(map).sort(([a], [b]) => b - a);
}

export default function SemesterList({ semesters }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [state, formAction, isPending] = useActionState(
    createSemesterAction,
    null
  );

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const grouped = groupByYear(semesters);

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>My Semesters</h1>
          <span className={styles.semesterCount}>
            {semesters.length} semester{semesters.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          id="add-semester-btn"
          className={styles.addButton}
          onClick={() => setIsOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New Semester
        </button>
      </div>

      {/* ── Content ── */}
      {semesters.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">📚</div>
          <h2 className={styles.emptyTitle}>No semesters yet</h2>
          <p className={styles.emptySubtitle}>
            Add your first semester to start tracking your grades.
          </p>
          <button
            className={styles.emptyAction}
            onClick={() => setIsOpen(true)}
          >
            + Add First Semester
          </button>
        </div>
      ) : (
        <div className={styles.semesterList}>
          {grouped.map(([year, semList]) => (
            <div key={year} className={styles.yearGroup}>
              <div className={styles.yearLabel}>{year}</div>
              <div className={styles.semesterRow}>
                {semList.map((semester) => (
                  <Link
                    href={`/semester/${semester.id}`}
                    key={semester.id}
                    className={styles.semesterCard}
                    id={`semester-card-${semester.id}`}
                  >
                    <div className={styles.cardChip}>
                      Semester {semester.number}
                    </div>
                    <div className={styles.cardMainText}>
                      {ORDINALS[semester.number] || `${semester.number}th`}{" "}
                      Semester
                    </div>
                    <div className={styles.cardYear}>{year}</div>
                    <div className={styles.cardArrow} aria-hidden="true">
                      →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add new semester"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className={styles.modalTitle}>New Semester</h2>
            <p className={styles.modalSubtitle}>
              Choose the semester and academic year.
            </p>

            <form action={formAction} className={styles.form}>
              {/* Hidden field carries the chosen number */}
              <input type="hidden" name="number" value={selectedNumber} />

              {/* Semester visual toggle */}
              <fieldset className={styles.fieldset}>
                <legend className={styles.fieldLabel}>Semester</legend>
                <div className={styles.toggleGroup}>
                  {[1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      id={`semester-toggle-${n}`}
                      className={`${styles.toggleBtn} ${selectedNumber === n ? styles.toggleBtnActive : ""}`}
                      onClick={() => setSelectedNumber(n)}
                      aria-pressed={selectedNumber === n}
                    >
                      <span className={styles.toggleOrdinal}>{ORDINALS[n]}</span>
                      <span className={styles.toggleSub}>Semester</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Year input */}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="year-input">
                  Year
                </label>
                <input
                  id="year-input"
                  type="number"
                  name="year"
                  required
                  min="2000"
                  max="2100"
                  defaultValue={currentYear}
                  className={styles.input}
                />
              </div>

              {state?.error && (
                <p className={styles.errorMessage} role="alert">
                  {state.error}
                </p>
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
                  id="submit-semester-btn"
                  className={styles.submitButton}
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Add Semester"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
