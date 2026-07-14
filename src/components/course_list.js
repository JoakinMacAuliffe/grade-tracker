"use client";

import { useEffect, useState, useCallback } from "react";
import { useActionState } from "react";
import { createCourseAction } from "../lib/actions/course.js";
import styles from "./course_list.module.css";
import Link from "next/link";
import { coursesList } from "../lib/data/coursesList.js";

const JSON_EXAMPLE = JSON.stringify(
  [
    {
      code: "CBM-1000",
      title: "Cálculo I",
      credits: 5,
      exemptionGrade: 5.0,
      evaluations: [
        { title: "Control 1", weight: 15, grade: 6.8 },
        { title: "Control 2", weight: 15, grade: 6.7 },
        { title: "Solemne 1", weight: 35, grade: 6.4 },
        { title: "Solemne 2", weight: 35, grade: 7.0 },
      ],
    },
  ],
  null,
  2
);

export default function CourseList({ semester, courses }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [jsonParsed, setJsonParsed] = useState(null);
  const [jsonImporting, setJsonImporting] = useState(false);
  const [jsonSuccess, setJsonSuccess] = useState(null);
  const [state, formAction, isPending] = useActionState(
    createCourseAction,
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
      setSearchTerm("");
      setSelectedCourse(null);
    }
  }, [state]);

  // Close modals on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsJsonOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Live-validate JSON as the user types
  const handleJsonChange = useCallback((value) => {
    setJsonText(value);
    setJsonSuccess(null);
    if (!value.trim()) {
      setJsonError(null);
      setJsonParsed(null);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        setJsonError("JSON must be an array [ ... ]");
        setJsonParsed(null);
        return;
      }
      setJsonError(null);
      setJsonParsed(parsed);
    } catch (e) {
      setJsonError(`Invalid JSON: ${e.message}`);
      setJsonParsed(null);
    }
  }, []);

  const handleJsonImport = async () => {
    if (!jsonParsed) return;
    setJsonImporting(true);
    setJsonError(null);
    try {
      const res = await fetch("/api/import-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semesterId: semester.id, courses: jsonParsed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setJsonError(data.error || "Import failed");
      } else {
        setJsonSuccess(`✓ Successfully imported ${data.imported} course${data.imported !== 1 ? "s" : ""}`);
        setJsonText("");
        setJsonParsed(null);
        // Refresh the page to show new courses
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (e) {
      setJsonError(e.message);
    } finally {
      setJsonImporting(false);
    }
  };

  const openJsonModal = () => {
    setJsonText("");
    setJsonError(null);
    setJsonParsed(null);
    setJsonSuccess(null);
    setIsJsonOpen(true);
  };

  const filteredCourses = coursesList.filter((course) => {
    const normalizedSearchTerm = searchTerm
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const normalizedCode = course.code
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const normalizedTitle = course.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      normalizedCode.includes(normalizedSearchTerm) ||
      normalizedTitle.includes(normalizedSearchTerm)
    );
  });

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setSearchTerm(course.code);
    setShowSuggestions(false);
  };

  return (
    <>
      <div className={styles.semesterContainer}>
        <div className={styles.semesterBox}>
          <div className={styles.semesterBadge}>
            <span className={styles.semesterNumber}>S{semester.number}</span>
            <span className={styles.semesterYear}>{semester.year}</span>
          </div>

          <div className={styles.semesterStats}>
            <div className={styles.statRow}>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{courses.length}</span>
                <span className={styles.statLabel}>Courses</span>
              </div>
            </div>

            <div className={styles.statRow}>
              <div className={styles.statContent}>
                <span className={styles.statValue}>
                  {courses.reduce((sum, course) => sum + course.credits, 0)}
                </span>
                <span className={styles.statLabel}>Credits</span>
              </div>
            </div>
          </div>
        </div>

        <Link href="/" className={styles.backButton}> ←  Semester list</Link>
      </div>

      <div className={styles.container}>
        {/* Courses Section */}
        <div className={styles.coursesSection}>
          <div className={styles.coursesHeader}>
            <h2 className={styles.coursesTitle}>Courses</h2>
            <div className={styles.headerActions}>
              <button
                className={styles.importButton}
                onClick={openJsonModal}
                title="Bulk import courses from JSON"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" suppressHydrationWarning>
                  <path d="M6.5 1v8M3 6l3.5 3.5L10 6M2 11h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning/>
                </svg>
                Import JSON
              </button>
              <button
                className={styles.addButton}
                onClick={() => setIsOpen(true)}
              >
                + Add Course
              </button>
            </div>
          </div>

          <div className={styles.courseGrid}>
            {courses.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyMessage}>No courses added yet.</p>
                <p className={styles.emptyHint}>
                  Click "Add Course" to get started
                </p>
              </div>
            ) : (
              courses.map((course) => (
                <Link
                  href={`/semester/${semester.id}/course/${course.id}`}
                  key={course.id}
                  className={styles.courseCard}
                >
                  <div className={styles.courseHeader}>
                    <span className={styles.courseCode}>
                      {course.courseCode}
                    </span>
                    <span className={styles.courseCredits}>
                      {course.credits} CR
                    </span>
                  </div>
                  <div className={styles.courseTitle}>{course.title}</div>
                  <div className={styles.courseFooter}>
                    <span className={styles.exemptionLabel}>Exemption</span>
                    <span className={styles.exemptionValue}>
                      {course.exemptionGrade}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {isOpen && (
          <div className={styles.courseForm} onClick={() => setIsOpen(false)}>
            <div
              className={styles.formContainer}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Add New Course</h3>
              <form action={formAction}>
                <input type="hidden" name="semesterId" value={semester.id} />

                <label>
                  Course Code:
                  <div className={styles.autocompleteWrapper}>
                    <input
                      type="text"
                      name="courseCode"
                      required
                      maxLength={8}
                      placeholder="Search by code or name..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions &&
                      searchTerm &&
                      filteredCourses.length > 0 && (
                        <ul className={styles.suggestions}>
                          {filteredCourses.slice(0, 5).map((course) => (
                            <li
                              key={course.code}
                              onClick={() => handleCourseSelect(course)}
                            >
                              <strong>{course.code}</strong> - {course.title}
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                </label>

                <label>
                  Course Title:
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="Introduction to Programming"
                    value={selectedCourse?.title || ""}
                    onChange={(e) =>
                      setSelectedCourse({
                        ...selectedCourse,
                        title: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Credits:
                  <input
                    type="number"
                    name="credits"
                    required
                    min="1"
                    max="10"
                    value={selectedCourse?.credits || ""}
                    onChange={(e) =>
                      setSelectedCourse({
                        ...selectedCourse,
                        credits: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Exemption Grade:
                  <input
                    type="number"
                    name="exemptionGrade"
                    step="0.1"
                    min="1.0"
                    max="7.0"
                    defaultValue="5.0"
                  />
                </label>

                {state?.error && (
                  <p className={styles.errorMessage}>{state.error}</p>
                )}

                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => {
                      setIsOpen(false);
                      setSearchTerm("");
                      setSelectedCourse(null);
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isPending}
                  >
                    {isPending ? "Saving..." : "Save Course"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── JSON Import Modal ── */}
      {isJsonOpen && (
        <div
          className={styles.courseForm}
          onClick={() => setIsJsonOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Import courses from JSON"
        >
          <div
            className={`${styles.formContainer} ${styles.jsonModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={() => setIsJsonOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <h3 className={styles.jsonModalTitle}>Import from JSON</h3>
            <p className={styles.jsonModalSubtitle}>
              Paste an array of courses to bulk-import with their evaluations.
            </p>

            {/* Example / template */}
            <details className={styles.jsonExample}>
              <summary className={styles.jsonExampleToggle}>Show example format</summary>
              <pre className={styles.jsonExampleCode}>{JSON_EXAMPLE}</pre>
            </details>

            <div className={styles.jsonField}>
              <label className={styles.jsonLabel} htmlFor="json-import-input">
                JSON data
              </label>
              <textarea
                id="json-import-input"
                className={`${styles.jsonTextarea} ${
                  jsonError
                    ? styles.jsonTextareaError
                    : jsonParsed
                    ? styles.jsonTextareaOk
                    : ""
                }`}
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder={`Paste your JSON array here…\n\n${JSON_EXAMPLE}`}
                spellCheck={false}
                autoComplete="off"
                rows={14}
              />
              {jsonError && (
                <p className={styles.jsonErrorMsg} role="alert">
                  {jsonError}
                </p>
              )}
              {jsonParsed && !jsonError && (
                <p className={styles.jsonPreviewMsg}>
                  ✓ Valid — {jsonParsed.length} course{jsonParsed.length !== 1 ? "s" : ""} detected
                </p>
              )}
              {jsonSuccess && (
                <p className={styles.jsonSuccessMsg}>{jsonSuccess}</p>
              )}
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setIsJsonOpen(false)}
                disabled={jsonImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                id="json-import-submit"
                className={styles.submitButton}
                onClick={handleJsonImport}
                disabled={!jsonParsed || jsonImporting}
              >
                {jsonImporting ? "Importing…" : `Import${jsonParsed ? ` ${jsonParsed.length} course${jsonParsed.length !== 1 ? "s" : ""}` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
