"use client";

import styles from "./header.module.css";
import { logoutAction } from "../lib/actions/auth";

export default function LogoutButton() {
  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <div className={styles.logOutContainer}>
      <button className={styles.logOut} onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
