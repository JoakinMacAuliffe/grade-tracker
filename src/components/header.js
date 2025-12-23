import { cookies } from "next/headers";
import styles from "./header.module.css";
import LogoutButton from "./logout_button";

export default async function Header() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has("app_password");

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {isLoggedIn && <LogoutButton />}
        <div className={styles.headerTitle}>Grade Tracker</div>
      </div>
    </header>
  );
}
