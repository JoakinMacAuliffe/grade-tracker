"use client";

import { useActionState } from "react";
import { registerAction } from "../../lib/actions/auth";
import Link from "next/link";
import styles from "./register.module.css";

export default function Register() {
  const [state, formAction] = useActionState(registerAction, null);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginContainer}>
        <h1 className={`${styles.coolerFont} ${styles.title}`}>Register</h1>

        <form action={formAction} className={styles.loginForm}>
          <label
            className={`${styles.coolerFont} ${styles.label}`}
            htmlFor="email"
          >
            Email
          </label>
          <input
            className={styles.textInput}
            type="email"
            id="email"
            required
            name="email"
            autoComplete="email"
            placeholder="your@email.com"
          />

          <label
            className={`${styles.coolerFont} ${styles.label}`}
            htmlFor="password"
          >
            Password
          </label>
          <input
            className={styles.textInput}
            type="password"
            id="password"
            required
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
          />

          {state?.error && <div className={styles.error}>{state.error}</div>}

          <button
            className={`${styles.submitButton} ${styles.coolerFont}`}
            type="submit"
          >
            Create Account
          </button>
        </form>

        <div className={`${styles.coolerFont} ${styles.registerLink}`}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
