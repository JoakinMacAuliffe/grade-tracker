import Link from "next/link";
import styles from "./footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        Made by&nbsp; 
        <Link
          href="https://github.com/JoakinMacAuliffe"
          className={styles.hyperlink}
        >
          Joakin Mac Auliffe
        </Link>
      </div>
    </footer>
  );
}