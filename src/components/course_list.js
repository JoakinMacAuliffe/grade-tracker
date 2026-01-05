"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { createCourseAction } from "../lib/actions/course.js";
import styles from "./course_list.module.css";
import Link from "next/link";
import { coursesList } from "../lib/data/coursesList.js";

export default function CourseList({ semester, courses }) {
  const [isOpen, setIsOpen] = useState(false);
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

          {semester.startDate && semester.endDate && (
            <div className={styles.semesterDuration}>
              <span className={styles.durationText}>
                {new Date(semester.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(semester.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        <Link href="/" className={styles.backButton}> ←  Semester list</Link>
      </div>

      <div className={styles.container}>
        {/* Courses Section */}
        <div className={styles.coursesSection}>
          <div className={styles.coursesHeader}>
            <h2 className={styles.coursesTitle}>Courses</h2>
            <button
              className={styles.addButton}
              onClick={() => setIsOpen(true)}
            >
              + Add Course
            </button>
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
    </>
  );
}
