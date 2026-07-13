"use server"; // uses server because we're working with the db

import { revalidatePath } from "next/cache";
import { semesters } from "../../db/schema.js";
import { db } from "../db.js";
import { getCurrentUserId } from "../auth-helpers.js";

export async function createSemesterAction(prevState, formData) {
  try {
    const number = parseInt(formData.get("number"));
    const year = parseInt(formData.get("year"));
    const userId = await getCurrentUserId();

    await db.insert(semesters).values({
      year,
      number,
      userId,
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

export async function deleteSemesterAction(prevState, formData) {
  try {
    const semesterId = parseInt(formData.get("semesterId"));

    await db.delete(semesters).where(eq(semesters.id, semesterId));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}
