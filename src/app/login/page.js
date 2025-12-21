"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import styles from "./login.module.css";

export default function Login() {
  const [state, formAction] = useActionState(loginAction, null); // used to show error

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginContainer}>
        <div className={styles.spacer}></div>

        <div
          className={`${styles.coolerFont} ${styles.title} ${styles.bigText}`}
          id="wobble"
        >
          primitive but effective security caution
        </div>

        <div className={styles.spacer}></div>

        <div className={styles.spacer}></div>

        <form action={formAction}>
          <label className={styles.coolerFont} htmlFor="password">
            Master password:
          </label>
          <div className={styles.smallerSpacer}></div>

          <input
            className={styles.textInput}
            type="password"
            id="password"
            required
            name="password"
          />

          {state?.error && (
            <div style={{color: 'red', marginTop: '10px', fontSize:'14px'}}>
              {state.error}
            </div>
          )}

          <div className={styles.spacer}></div>
          <div className={styles.spacer}></div>

          <button
            className={`${styles.submitButton} ${styles.coolerFont}`}
            type="submit"
          >
            Login
          </button>
        </form>

        <div className={styles.spacer}></div>
        <div className={styles.spacer}></div>
      </div>
    </div>
  );
}
