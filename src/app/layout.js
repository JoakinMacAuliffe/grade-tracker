import "./globals.css";
import Header from "../components/header";
import Footer from "../components/footer";

import { Analytics } from "@vercel/analytics";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head></head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
