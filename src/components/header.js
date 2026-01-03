import styles from "./header.module.css";
import LogoutButton from "./logout_button";
import { isLoggedIn } from "../lib/auth-helpers";

export default async function Header() {
  const loggedIn = await isLoggedIn();

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {loggedIn && <LogoutButton />}
        <div className={styles.headerTitle}>Grade Vault</div>
      </div>
    </header>
  );
}
