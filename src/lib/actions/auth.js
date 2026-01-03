"use server";

import { signIn, signOut } from "../../auth.js";
import { db } from "../db.js";
import { users } from "../../db/schema.js";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

export async function loginAction(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error.type === "CredentialsSignIn") {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}

export async function registerAction(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    // validate password length
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters " };
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await db.insert(users).values({
      email,
      passwordHash,
    });

    // Auto sign in after registering
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Authentication failed" };
    }
    if (error.code === "23505") {
      // Postgres unique violation
      return { error: "Email already exists" };
    }
    return { error: "Registration failed. Please try again." };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
