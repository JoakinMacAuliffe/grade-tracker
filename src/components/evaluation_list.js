"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useActionState } from "react";
import Link from "next/link";
import {
  createStandaloneEvaluationAction,
  createGroupAction,
  updateEvaluationGradeAction,
  updateExamGradeAction,
  deleteEvaluationAction,
  deleteGroupAction,
} from "../lib/actions/evaluation.js";
import { calculateCourseGrade } from "../lib/gradeCalculator.js";
import styles from "./evaluation_list.module.css";

const JSON_EVAL_EXAMPLE = JSON.stringify(
  [
    { title: "Control 1", weight: 15, grade: 6.8 },
    { title: "Control 2", weight: 15, grade: 6.7 },
    { title: "Solemne 1", weight: 35, grade: 6.4 },
    { title: "Solemne 2", weight: 35 },
  ],
  null,
  2
);

// ─────────────────────────────────────────────────────────────────
// Grade Summary Card
// ─────────────────────────────────────────────────────────────────

function GradeSummaryCard({ gradeData, course, semesterId }) {
  const [editingExam, setEditingExam] = useState(false);
  const [examState, examFormAction, examPending] = useActionState(
    updateExamGradeAction,
    null
  );

  useEffect(() => {
    if (examState?.success) setEditingExam(false);
  }, [examState]);

  const {
    currentNp,
    maxPossibleNp,
    needsExam,
    finalGrade,
    completedWeight,
    totalWeight,
    allComplete,
  } = gradeData;

  const exemption = parseFloat(course.exemptionGrade) || 5.0;
  const progressPct =
    totalWeight > 0 ? Math.min((completedWeight / totalWeight) * 100, 100) : 0;

  const gradeClass =
    currentNp >= 4.0
      ? currentNp >= exemption
        ? styles.passing
        : styles.warning
      : currentNp > 0
      ? styles.failing
      : "";

  const showExamSection =
    currentNp > 0 && needsExam;

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryMain}>
        {/* Current NP */}
        <div className={styles.npDisplay}>
          <span className={`${styles.npValue} ${gradeClass}`}>
            {currentNp > 0 ? currentNp.toFixed(2) : "—"}
          </span>
          <span className={styles.npLabel}>
            {allComplete ? "NP" : "Current NP"}
          </span>
        </div>

        {/* Stats */}
        <div className={styles.summaryStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {maxPossibleNp > 0 ? maxPossibleNp.toFixed(2) : "—"}
            </span>
            <span className={styles.statLabel}>Max possible</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {Math.round(progressPct)}%
            </span>
            <span className={styles.statLabel}>Evaluated</span>
          </div>
          {finalGrade !== null && (
            <div className={styles.statItem}>
              <span
                className={`${styles.statValue} ${
                  finalGrade >= exemption ? styles.passing : styles.failing
                }`}
              >
                {finalGrade.toFixed(1)}
              </span>
              <span className={styles.statLabel}>Final grade</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Exam section */}
      {showExamSection && (
        <div className={styles.examSection}>
          <div className={styles.examBadge}>
            ⚠ Exam required — NP ≤ {exemption}
          </div>
          <div className={styles.examFormula}>
            Final = 70% × NP + 30% × Exam
          </div>
          {editingExam ? (
            <form action={examFormAction} className={styles.examForm}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="semesterId" value={semesterId} />
              <input
                type="number"
                name="examGrade"
                step="0.1"
                min="1.0"
                max="7.0"
                placeholder="1.0 – 7.0"
                defaultValue={course.examGrade ?? ""}
                className={styles.examInput}
                autoFocus
              />
              <button
                type="submit"
                className={styles.examSaveBtn}
                disabled={examPending}
              >
                {examPending ? "…" : "Save"}
              </button>
              <button
                type="button"
                className={styles.examCancelBtn}
                onClick={() => setEditingExam(false)}
              >
                Cancel
              </button>
              {examState?.error && (
                <span className={styles.inlineError}>{examState.error}</span>
              )}
            </form>
          ) : (
            <button
              className={styles.setExamBtn}
              onClick={() => setEditingExam(true)}
            >
              {course.examGrade
                ? `Exam: ${parseFloat(course.examGrade).toFixed(1)}`
                : "＋ Enter exam grade"}
            </button>
          )}
        </div>
      )}

      {allComplete && !needsExam && (
        <div className={styles.exemptBadge}>✓ Exempt from exam</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Standalone Eval Row
// ─────────────────────────────────────────────────────────────────

function EvalRow({ ev, semesterId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [gradeState, gradeFormAction, gradePending] = useActionState(
    updateEvaluationGradeAction,
    null
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteEvaluationAction,
    null
  );

  useEffect(() => {
    if (gradeState?.success) setIsEditing(false);
  }, [gradeState]);

  const w = parseFloat(ev.weight);
  const g = ev.grade !== null ? parseFloat(ev.grade) : null;
  const contrib = g !== null ? w * g : null;

  return (
    <div className={styles.evalRow}>
      <span className={styles.evalName}>{ev.title}</span>
      <span className={styles.evalWeight}>{Math.round(w * 100)}%</span>

      {/* Grade cell */}
      <div className={styles.gradeCell}>
        {isEditing ? (
          <form action={gradeFormAction} className={styles.gradeForm}>
            <input type="hidden" name="evalId" value={ev.id} />
            <input type="hidden" name="courseId" value={ev.courseId} />
            <input type="hidden" name="semesterId" value={semesterId} />
            <input
              type="number"
              name="grade"
              step="0.1"
              min="1.0"
              max="7.0"
              defaultValue={g ?? ""}
              className={styles.gradeInput}
              autoFocus
            />
            <button type="submit" className={styles.gradeConfirm} disabled={gradePending}>
              ✓
            </button>
            <button
              type="button"
              className={styles.gradeCancel}
              onClick={() => setIsEditing(false)}
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            className={`${styles.gradeBtn} ${g !== null ? styles.graded : styles.ungraded}`}
            onClick={() => setIsEditing(true)}
            title="Click to set grade"
          >
            {g !== null ? g.toFixed(1) : "—"}
          </button>
        )}
      </div>

      {/* Contribution */}
      <span className={styles.contribution}>
        {contrib !== null ? contrib.toFixed(3) : "—"}
      </span>

      {/* Delete */}
      <form action={deleteFormAction} className={styles.deleteForm}>
        <input type="hidden" name="evalId" value={ev.id} />
        <input type="hidden" name="courseId" value={ev.courseId} />
        <input type="hidden" name="semesterId" value={semesterId} />
        <button
          type="submit"
          className={styles.deleteBtn}
          disabled={deletePending}
          title="Delete evaluation"
        >
          ✕
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-eval row inside a group
// ─────────────────────────────────────────────────────────────────

function GroupEvalRow({ ev, semesterId, groupWeight, groupSize }) {
  const [isEditing, setIsEditing] = useState(false);
  const [gradeState, gradeFormAction, gradePending] = useActionState(
    updateEvaluationGradeAction,
    null
  );

  useEffect(() => {
    if (gradeState?.success) setIsEditing(false);
  }, [gradeState]);

  const g = ev.grade !== null ? parseFloat(ev.grade) : null;
  const itemWeight = groupWeight / groupSize;
  const contrib = g !== null ? itemWeight * g : null;

  return (
    <div className={styles.groupEvalRow}>
      <span className={styles.groupEvalName}>{ev.title}</span>
      <span className={styles.groupEvalWeight}>
        {(itemWeight * 100).toFixed(1)}%
      </span>

      {/* Grade cell */}
      <div className={styles.gradeCell}>
        {isEditing ? (
          <form action={gradeFormAction} className={styles.gradeForm}>
            <input type="hidden" name="evalId" value={ev.id} />
            <input type="hidden" name="courseId" value={ev.courseId} />
            <input type="hidden" name="semesterId" value={semesterId} />
            <input
              type="number"
              name="grade"
              step="0.1"
              min="1.0"
              max="7.0"
              defaultValue={g ?? ""}
              className={styles.gradeInput}
              autoFocus
            />
            <button type="submit" className={styles.gradeConfirm} disabled={gradePending}>
              ✓
            </button>
            <button
              type="button"
              className={styles.gradeCancel}
              onClick={() => setIsEditing(false)}
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            className={`${styles.gradeBtn} ${g !== null ? styles.graded : styles.ungraded}`}
            onClick={() => setIsEditing(true)}
          >
            {g !== null ? g.toFixed(1) : "—"}
          </button>
        )}
      </div>

      <span className={styles.contribution}>
        {contrib !== null ? contrib.toFixed(3) : "—"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Evaluation Group Card
// ─────────────────────────────────────────────────────────────────

function GroupCard({ group, semesterId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteGroupAction,
    null
  );

  const items = group.evaluations || [];
  const gw = parseFloat(group.totalWeight);
  const n = items.length;
  const completed = items.filter((ev) => ev.grade !== null);
  const c = completed.length;
  const completedSum = completed.reduce(
    (s, ev) => s + parseFloat(ev.grade),
    0
  );
  const avg = c > 0 ? completedSum / c : null;
  const contrib = avg !== null ? (gw * (c / n) * avg).toFixed(3) : null;

  return (
    <div className={styles.groupCard}>
      <div className={styles.groupHeader}>
        <button
          className={styles.groupToggle}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand group" : "Collapse group"}
        >
          <span className={styles.collapseIcon}>{collapsed ? "▸" : "▾"}</span>
          <span className={styles.groupName}>{group.name}</span>
          <span className={styles.groupMeta}>
            <span className={styles.evalWeight}>
              {Math.round(gw * 100)}%
            </span>
            <span className={styles.groupProgress}>
              {c}/{n} graded
            </span>
          </span>
        </button>

        <div className={styles.groupRight}>
          <span className={`${styles.gradeBtn} ${avg !== null ? styles.graded : styles.ungraded}`} style={{ cursor: "default" }}>
            avg {avg !== null ? avg.toFixed(2) : "—"}
          </span>
          <span className={styles.contribution}>{contrib ?? "—"}</span>
          <form action={deleteFormAction} className={styles.deleteForm}>
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="courseId" value={group.courseId} />
            <input type="hidden" name="semesterId" value={semesterId} />
            <button
              type="submit"
              className={styles.deleteBtn}
              disabled={deletePending}
              title="Delete group"
            >
              ✕
            </button>
          </form>
        </div>
      </div>

      {!collapsed && (
        <div className={styles.groupItems}>
          {/* Column headers */}
          <div className={`${styles.evalRow} ${styles.tableHeader}`}>
            <span>Item</span>
            <span>Weight</span>
            <span>Grade</span>
            <span>Contributes</span>
          </div>
          {items.map((ev) => (
            <GroupEvalRow
              key={ev.id}
              ev={ev}
              semesterId={semesterId}
              groupWeight={gw}
              groupSize={n}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Add Evaluation Modal
// ─────────────────────────────────────────────────────────────────

function AddEvalModal({
  onClose,
  courseId,
  semesterId,
  standaloneFormAction,
  standalonePending,
  standaloneState,
  groupFormAction,
  groupPending,
  groupState,
}) {
  const [tab, setTab] = useState("standalone");
  const [subEvals, setSubEvals] = useState([{ title: "" }, { title: "" }]);

  const addSubEval = () => setSubEvals((p) => [...p, { title: "" }]);
  const removeSubEval = (i) =>
    setSubEvals((p) => p.filter((_, idx) => idx !== i));
  const updateSubEval = (i, val) =>
    setSubEvals((p) => p.map((x, idx) => (idx === i ? { title: val } : x)));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add Evaluation</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.modalTabs}>
          <button
            className={tab === "standalone" ? styles.activeTab : styles.tab}
            onClick={() => setTab("standalone")}
          >
            Standalone
          </button>
          <button
            className={tab === "grouped" ? styles.activeTab : styles.tab}
            onClick={() => setTab("grouped")}
          >
            Grouped
          </button>
        </div>

        {tab === "standalone" ? (
          <form action={standaloneFormAction} className={styles.modalForm}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="semesterId" value={semesterId} />

            <label className={styles.formLabel}>
              Title
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Final Exam"
                className={styles.formInput}
              />
            </label>

            <label className={styles.formLabel}>
              Weight (%)
              <input
                type="number"
                name="weight"
                required
                step="0.1"
                min="1"
                max="100"
                placeholder="e.g. 30"
                className={styles.formInput}
              />
            </label>

            <label className={styles.formLabel}>
              Grade (optional)
              <input
                type="number"
                name="grade"
                step="0.1"
                min="1.0"
                max="7.0"
                placeholder="1.0 – 7.0"
                className={styles.formInput}
              />
            </label>

            {standaloneState?.error && (
              <p className={styles.formError}>{standaloneState.error}</p>
            )}

            <div className={styles.btnGroup}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={standalonePending}
              >
                {standalonePending ? "Saving…" : "Add"}
              </button>
            </div>
          </form>
        ) : (
          <form action={groupFormAction} className={styles.modalForm}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="semesterId" value={semesterId} />
            <input
              type="hidden"
              name="subEvalCount"
              value={subEvals.length}
            />

            <label className={styles.formLabel}>
              Group name
              <input
                type="text"
                name="groupName"
                required
                placeholder="e.g. Projects"
                className={styles.formInput}
              />
            </label>

            <label className={styles.formLabel}>
              Total weight (%)
              <input
                type="number"
                name="totalWeight"
                required
                step="0.1"
                min="1"
                max="100"
                placeholder="e.g. 30"
                className={styles.formInput}
              />
            </label>

            <div className={styles.subEvalSection}>
              <span className={styles.subEvalLabel}>Items</span>
              <p className={styles.subEvalHint}>
                Each item contributes equally to the group total.
              </p>

              {subEvals.map((se, i) => (
                <div key={i} className={styles.subEvalRow}>
                  <input
                    type="text"
                    name={`subEvalTitle_${i}`}
                    placeholder={`Item ${i + 1} title`}
                    value={se.title}
                    onChange={(e) => updateSubEval(i, e.target.value)}
                    className={styles.formInput}
                  />
                  {subEvals.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeSubEval(i)}
                    >
                      —
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                className={styles.addSubBtn}
                onClick={addSubEval}
              >
                ＋ Add item
              </button>
            </div>

            {groupState?.error && (
              <p className={styles.formError}>{groupState.error}</p>
            )}

            <div className={styles.btnGroup}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={groupPending}
              >
                {groupPending ? "Saving…" : "Create Group"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// JSON Import Modal
// ─────────────────────────────────────────────────────────────────

function JsonImportEvalModal({ onClose, courseId, semesterId }) {
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [jsonParsed, setJsonParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleChange = useCallback((value) => {
    setJsonText(value);
    setSuccess(null);
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

  const handleImport = async () => {
    if (!jsonParsed) return;
    setImporting(true);
    setJsonError(null);
    try {
      const res = await fetch("/api/import-course-evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, semesterId, evaluations: jsonParsed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setJsonError(data.error || "Import failed");
      } else {
        setSuccess(`✓ Imported ${data.imported} evaluation${data.imported !== 1 ? "s" : ""}`);
        setJsonText("");
        setJsonParsed(null);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) {
      setJsonError(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.jsonModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Import Evaluations</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <p className={styles.jsonModalSubtitle}>
          Paste an array of evaluations. <code>weight</code> is in percent (1–100),
          <code> grade</code> is optional (1.0–7.0).
        </p>

        {/* Collapsible example */}
        <details className={styles.jsonExample}>
          <summary className={styles.jsonExampleToggle}>Show example format</summary>
          <pre className={styles.jsonExampleCode}>{JSON_EVAL_EXAMPLE}</pre>
        </details>

        <div className={styles.jsonField}>
          <label className={styles.jsonLabel} htmlFor="eval-json-input">JSON data</label>
          <textarea
            id="eval-json-input"
            className={`${styles.jsonTextarea} ${
              jsonError
                ? styles.jsonTextareaError
                : jsonParsed
                ? styles.jsonTextareaOk
                : ""
            }`}
            value={jsonText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Paste your JSON array here\u2026\n\n${JSON_EVAL_EXAMPLE}`}
            spellCheck={false}
            autoComplete="off"
            rows={10}
          />
          {jsonError && (
            <p className={styles.jsonStatusMsg} style={{ color: "#ff8080" }} role="alert">
              {jsonError}
            </p>
          )}
          {jsonParsed && !jsonError && (
            <p className={styles.jsonStatusMsg} style={{ color: "rgb(100, 210, 130)" }}>
              ✓ Valid — {jsonParsed.length} evaluation{jsonParsed.length !== 1 ? "s" : ""} detected
            </p>
          )}
          {success && (
            <p className={`${styles.jsonStatusMsg} ${styles.jsonSuccess}`}>{success}</p>
          )}
        </div>

        <div className={styles.btnGroup}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={importing}>
            Cancel
          </button>
          <button
            type="button"
            id="eval-json-import-submit"
            className={styles.submitBtn}
            onClick={handleImport}
            disabled={!jsonParsed || importing}
          >
            {importing
              ? "Importing\u2026"
              : jsonParsed
              ? `Import ${jsonParsed.length} eval${jsonParsed.length !== 1 ? "s" : ""}`
              : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function EvaluationList({
  course,
  standaloneEvals,
  groups,
  semesterId,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);

  const [standaloneState, standaloneFormAction, standalonePending] =
    useActionState(createStandaloneEvaluationAction, null);
  const [groupState, groupFormAction, groupPending] = useActionState(
    createGroupAction,
    null
  );

  useEffect(() => {
    if (standaloneState?.success) setModalOpen(false);
  }, [standaloneState]);

  useEffect(() => {
    if (groupState?.success) setModalOpen(false);
  }, [groupState]);

  // Close modals on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setJsonModalOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const gradeData = useMemo(
    () =>
      calculateCourseGrade({
        standaloneEvals,
        groups,
        examGrade: course.examGrade,
        exemptionGrade: parseFloat(course.exemptionGrade) || 5.0,
      }),
    [standaloneEvals, groups, course.examGrade, course.exemptionGrade]
  );

  const hasEvals = standaloneEvals.length > 0 || groups.length > 0;

  return (
    <div className={styles.page}>
      {/* ── Top bar ───────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <Link href={`/semester/${semesterId}`} className={styles.backButton}>
          ← Semester
        </Link>
        <div className={styles.courseInfo}>
          <span className={styles.courseCode}>{course.courseCode}</span>
          <span className={styles.courseTitle}>{course.title}</span>
          <span className={styles.courseCredits}>{course.credits} CR</span>
        </div>
      </div>

      {/* ── Grade summary ──────────────────────────────────────── */}
      <GradeSummaryCard
        gradeData={gradeData}
        course={course}
        semesterId={semesterId}
      />

      {/* ── Evaluations card ───────────────────────────────────── */}
      <div className={styles.evalCard}>
        <div className={styles.evalCardHeader}>
          <h2 className={styles.evalCardTitle}>Evaluations</h2>
          <div className={styles.evalHeaderActions}>
            <button
              className={styles.importJsonBtn}
              onClick={() => setJsonModalOpen(true)}
              title="Bulk import evaluations from JSON"
            >
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden="true" suppressHydrationWarning>
                <path d="M6.5 1v8M3 6l3.5 3.5L10 6M2 11h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning/>
              </svg>
              Import JSON
            </button>
            <button
              className={styles.addBtn}
              onClick={() => setModalOpen(true)}
            >
              ＋ Add
            </button>
          </div>
        </div>

        {!hasEvals && (
          <div className={styles.empty}>
            <p>No evaluations added yet.</p>
            <p className={styles.emptyHint}>
              Click &quot;＋ Add&quot; to create your first evaluation.
            </p>
          </div>
        )}

        {standaloneEvals.length > 0 && (
          <div className={styles.standaloneSection}>
            {/* Column headers */}
            <div className={`${styles.evalRow} ${styles.tableHeader}`}>
              <span>Evaluation</span>
              <span>Weight</span>
              <span>Grade</span>
              <span>Contributes</span>
              <span />
            </div>

            {standaloneEvals.map((ev) => (
              <EvalRow key={ev.id} ev={ev} semesterId={semesterId} />
            ))}
          </div>
        )}

        {groups.map((group) => (
          <GroupCard key={group.id} group={group} semesterId={semesterId} />
        ))}
      </div>

      {/* ── Add modal ──────────────────────────────────────────── */}
      {modalOpen && (
        <AddEvalModal
          onClose={() => setModalOpen(false)}
          courseId={course.id}
          semesterId={semesterId}
          standaloneFormAction={standaloneFormAction}
          standalonePending={standalonePending}
          standaloneState={standaloneState}
          groupFormAction={groupFormAction}
          groupPending={groupPending}
          groupState={groupState}
        />
      )}

      {/* ── JSON import modal ───────────────────────────────────── */}
      {jsonModalOpen && (
        <JsonImportEvalModal
          onClose={() => setJsonModalOpen(false)}
          courseId={course.id}
          semesterId={semesterId}
        />
      )}
    </div>
  );
}
