"use client";

import styles from "./login.module.css";

export default function Login() {
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

        <div className={styles.spacer}></div>
        <div className={styles.spacer}></div>

        <button
          className={`${styles.submitButton} ${styles.coolerFont}`}
          type="submit"
        >
          Login
        </button>

        <div className={styles.spacer}></div>
        <div className={styles.spacer}></div>

      </div>
    </div>
  );
}
