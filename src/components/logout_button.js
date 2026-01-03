"use client";

import styles from "./header.module.css";
import { signOutAction } from "../lib/actions/auth";

export default function LogoutButton() {
  const handleLogout = async () => {
    await signOutAction();
  };

  return (
    <div className={styles.logOutContainer}>
      <button className={styles.logOut} onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
