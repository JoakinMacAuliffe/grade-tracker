// Every HTML line of code in this file is crap (i reused this login screen from my first webdev class...)

// UPDATE: I gave up on it and i'll just redo it with AI

"use client";

import { useActionState } from "react";
import { loginAction } from "../../lib/actions/auth";
import styles from "./login.module.css";
import Link from "next/link";

export default function Login() {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginContainer}>
        <h1 className={`${styles.coolerFont} ${styles.title}`}>Log in</h1>

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
            autoComplete="current-password"
            placeholder="••••••••"
          />

          {state?.error && <div className={styles.error}>{state.error}</div>}

          <button
            className={`${styles.submitButton} ${styles.coolerFont}`}
            type="submit"
          >
            Enter
          </button>
        </form>

        <div className={`${styles.coolerFont} ${styles.registerLink}`}>
          Don't have an account?{" "}
          <Link href="/register" className={styles.link}>
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
