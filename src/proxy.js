import { NextResponse } from "next/server";

export function proxy(request) {
  const passwordCookie = request.cookies.get("app_password")?.value;
  const pathName = request.nextUrl.pathname;

  // let unlogged users to access the login page and essential next resources
  if (pathName === "/login" || pathName.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (passwordCookie !== process.env.MASTER_PASSWORD) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|login|images).*)"], // Protect everything except login and _next
};
