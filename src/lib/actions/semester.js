"use server"; // uses server because we're working with the db

import { revalidatePath } from "next/cache";
import { semesters } from "../../db/schema.js";
import { db } from "../db.js";

export async function createSemesterAction(prevState, formData) {
  try {
    const number = parseInt(formData.get("number"));
    const year = parseInt(formData.get("year"));
    const startDate = formData.get("startDate") || null;
    const endDate = formData.get("endDate") || null;

    // Automatically set if the semester is active or not

    let active = false;

    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const now = Date.now();

      active = now >= start && now <= end;
    }

    await db.insert(semesters).values({
      number,
      year,
      startDate,
      endDate,
      active,
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}
