# Grade Vault — JSON Import Guide for AI Assistants

This guide explains how to convert grade data into the JSON formats accepted by Grade Vault. There are **two import endpoints**, used at different levels of the app.

---

## Overview

| Endpoint | Where to use it | What it creates |
|---|---|---|
| **Semester import** | On a semester's course list page | Courses + their evaluations, all at once |
| **Course eval import** | Inside an existing course's page | Evaluations only, added to an existing course |

Both endpoints accept a **mixed array** where each item is either a **standalone evaluation** or an **evaluation group**. Detection is automatic: if an item has an `"items"` array it is a group; if it has a `"weight"` field it is standalone.

---

## 1. Semester Import — `POST /api/import-semester`

Use this when importing a full semester's worth of courses from scratch.

### JSON structure

```json
[
  {
    "code": "CBM-1000",
    "title": "Cálculo I",
    "credits": 5,
    "exemptionGrade": 5.0,
    "examGrade": null,
    "evaluations": [
      {
        "name": "Controles",
        "totalWeight": 30,
        "items": [
          { "title": "Control 1", "grade": 6.8 },
          { "title": "Control 2", "grade": 6.7 },
          { "title": "Control 3", "grade": 7.0 }
        ]
      },
      { "title": "Solemne 1", "weight": 35, "grade": 6.4 },
      { "title": "Solemne 2", "weight": 35, "grade": 7.0 }
    ]
  }
]
```

The outer value is always an **array** — even for a single course.

### Field reference

#### Course fields

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `code` | string | ✅ | Max 8 characters | Course code, e.g. `"CBM-1000"` |
| `title` | string | ✅ | Non-empty | Full course name |
| `credits` | integer | ✅ | ≥ 1 | Number of academic credits |
| `exemptionGrade` | number | ❌ | 1.0 – 7.0 | Grade needed to skip the final exam. **Defaults to 5.0** if omitted |
| `examGrade` | number \| null | ❌ | 1.0 – 7.0 or `null` | Final exam grade. Omit or use `null` if not yet taken |
| `evaluations` | array | ❌ | Mixed array (see below) | Standalone evals and/or groups. Omit if none |

---

## 2. Course Eval Import — `POST /api/import-course-evals`

Use this when a course already exists and you only need to add its evaluations.

### JSON structure

```json
[
  {
    "name": "Controles",
    "totalWeight": 30,
    "items": [
      { "title": "Control 1", "grade": 6.8 },
      { "title": "Control 2", "grade": 6.7 },
      { "title": "Control 3", "grade": 7.0 }
    ]
  },
  { "title": "Solemne 1", "weight": 35, "grade": 6.4 },
  { "title": "Solemne 2", "weight": 35, "grade": 7.0 }
]
```

This is a flat mixed array — **no course wrapper**.

---

## Evaluation entry types

Both endpoints share the same evaluation format. Each entry in the array is one of:

### Standalone evaluation

```json
{ "title": "Solemne 1", "weight": 35, "grade": 6.4 }
```

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `title` | string | ✅ | Non-empty | Name of the evaluation |
| `weight` | number | ✅ | 0 – 100 | Percentage weight. **Use 0** for dropped/non-counting evaluations |
| `grade` | number \| null | ❌ | 1.0 – 7.0 or `null` | Grade received, or omit if pending |

### Evaluation group

```json
{
  "name": "Controles",
  "totalWeight": 30,
  "items": [
    { "title": "Control 1", "grade": 6.8 },
    { "title": "Control 2", "grade": 6.7 }
  ]
}
```

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `name` | string | ✅ | Non-empty | Display name of the group, e.g. `"Controles"` |
| `totalWeight` | number | ✅ | 0 – 100 | Total percentage weight shared equally among all items |
| `items` | array | ✅ | ≥ 1 item | The evaluations inside the group |
| `items[].title` | string | ✅ | Non-empty | Name of the item |
| `items[].grade` | number \| null | ❌ | 1.0 – 7.0 or `null` | Grade received, or omit if pending |

> **Important:** Items within a group do **not** have individual weights — the group's `totalWeight` is divided equally among all items automatically.

> **Important:** The sum of all `weight` (standalone) + `totalWeight` (group) values across the array must not exceed **100**.

---

## Grading scale

This app uses the **Chilean 1.0 – 7.0 grading scale**:

| Grade | Meaning |
|---|---|
| 7.0 | Perfect |
| 6.0 – 6.9 | Excellent |
| 5.0 – 5.9 | Good |
| 4.0 – 4.9 | Passing (minimum pass) |
| 1.0 – 3.9 | Failing |

- All grades must be between **1.0 and 7.0** (inclusive)
- Grades with one decimal place are standard (e.g. `6.8`, `5.5`, `4.0`)

---

## How to handle 0-weight evaluations

Some courses have controls where the lowest grade(s) are dropped and replaced by an average. The dropped ones still appear on the grade sheet but don't count. Model these as standalone evaluations with `"weight": 0`:

```json
[
  { "title": "Control 1", "weight": 15, "grade": 6.8 },
  { "title": "Control 2", "weight": 0,  "grade": 6.7 },
  { "title": "Control 3", "weight": 15, "grade": 7.0 }
]
```

Control 2 is shown (for historical reference) but contributes nothing to the grade.

---

## Complete real-world examples

### Example 1 — Group of controls + standalone solemnes

Grade sheet:

| Evaluation | Grade | Weight |
|---|---|---|
| Control 1 (avg group, 30% total) | 6.8 | 10% |
| Control 2 (avg group, 30% total) | 6.7 | 10% |
| Control 3 (avg group, 30% total) | 7.0 | 10% |
| Solemne 1 | 6.4 | 35% |
| Solemne 2 | 7.0 | 35% |

JSON for course eval import:

```json
[
  {
    "name": "Controles",
    "totalWeight": 30,
    "items": [
      { "title": "Control 1", "grade": 6.8 },
      { "title": "Control 2", "grade": 6.7 },
      { "title": "Control 3", "grade": 7.0 }
    ]
  },
  { "title": "Solemne 1", "weight": 35, "grade": 6.4 },
  { "title": "Solemne 2", "weight": 35, "grade": 7.0 }
]
```

### Example 2 — Dropped controls (0-weight) + standalone

Grade sheet where the lowest control is dropped:

| Evaluation | Grade | Weight |
|---|---|---|
| Control 1 | 6.8 | 15% |
| Control 2 *(dropped)* | 6.7 | 0% |
| Control 3 | 7.0 | 15% |
| Solemne 1 | 6.4 | 35% |
| Solemne 2 | 7.0 | 35% |

```json
[
  { "title": "Control 1", "weight": 15, "grade": 6.8 },
  { "title": "Control 2", "weight": 0,  "grade": 6.7 },
  { "title": "Control 3", "weight": 15, "grade": 7.0 },
  { "title": "Solemne 1", "weight": 35, "grade": 6.4 },
  { "title": "Solemne 2", "weight": 35, "grade": 7.0 }
]
```

### Example 3 — Full semester import with a group

```json
[
  {
    "code": "CBM-1000",
    "title": "Cálculo I",
    "credits": 5,
    "exemptionGrade": 5.0,
    "evaluations": [
      {
        "name": "Controles",
        "totalWeight": 30,
        "items": [
          { "title": "Control 1", "grade": 6.8 },
          { "title": "Control 2", "grade": 6.7 },
          { "title": "Control 3", "grade": 7.0 }
        ]
      },
      { "title": "Solemne 1", "weight": 35, "grade": 6.4 },
      { "title": "Solemne 2", "weight": 35, "grade": 7.0 }
    ]
  }
]
```

---

## Common mistakes to avoid

| Mistake | Wrong | Correct |
|---|---|---|
| Grade out of range | `"grade": 8.5` | `"grade": 7.0` |
| Weight as decimal fraction | `"weight": 0.35` | `"weight": 35` |
| Adding weight to group items | `{ "title": "C1", "weight": 10 }` inside `items` | Omit `weight` inside items; use `totalWeight` on the group |
| Total weights over 100 | sum of weights = 120 | sum of all `weight` + `totalWeight` ≤ 100 |
| Not an array | `{ ... }` | `[ { ... } ]` |
| Code too long | `"code": "MATHEMATICS101"` | `"code": "MAT-101"` (max 8 chars) |
| Missing required fields | omitting `title` or `credits` | always include them |
| Using `undefined` | `"grade": undefined` | `"grade": null` or omit the field |

---

## Detection logic (for AI assistants)

The import automatically detects the entry type:

- Entry has **`"items"` array** → treated as an **evaluation group**
- Entry has **`"weight"` field** (no `items`) → treated as a **standalone evaluation**

You should never mix both in the same entry.

---

## AI prompt templates

### For course eval import (evaluations only):

> Convert the following grade data into a JSON array for the Grade Vault course eval import format.
> Rules:
> - Output a flat JSON array where each item is either a standalone evaluation or a group
> - Standalone: `{ "title": string, "weight": number (0–100), "grade"?: number (1.0–7.0) | null }`
> - Group: `{ "name": string, "totalWeight": number (0–100), "items": [{ "title": string, "grade"?: number | null }] }`
> - Use a **group** when multiple controls share a pooled weight and their average counts (e.g. "best 3 of 4 controls, worth 30% total")
> - Use **standalone with weight 0** for evaluations that appear on the sheet but are dropped/don't count
> - `weight` / `totalWeight` are percentages (e.g. 35, not 0.35)
> - The sum of all `weight` and `totalWeight` values must not exceed 100
> - Grades use the Chilean 1.0–7.0 scale; use `null` (or omit) for ungraded items
> - Output only the JSON array, no explanation
>
> Grade data:
> [paste your grade sheet here]

### For semester import (full courses):

> Convert the following semester grade data into a JSON array for the Grade Vault semester import format.
> Rules:
> - Output an array of course objects
> - Each course: `{ "code": string (max 8 chars), "title": string, "credits": integer, "exemptionGrade"?: number, "evaluations"?: [...] }`
> - The `evaluations` array is mixed: standalone evals or groups (same rules as above)
> - `exemptionGrade` defaults to 5.0 if not specified
> - Output only the JSON array, no explanation
>
> Semester data:
> [paste your grade sheet here]
