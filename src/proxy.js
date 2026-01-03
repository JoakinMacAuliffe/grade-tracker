export { auth as middleware } from "./auth.js";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register|images).*)"], // Protect everything except login and _next
};
