import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function requireAuth(request) {
    const passwordCookie = request.cookies.get("app_password")?.value;
    const pathName = request.nextUrl;

    // let unlogged users to access the login page and essential next resources
    if (pathname === "/login" || pathName.startsWith("/_next")) {
        return NextResponse.next();
    }

    if (passwordCookie !== process.env.MASTER_PASSWORD) {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    return NextResponse.next();
}

// which routes to protect  
export const config = {
    matcher: ["/home/:path*", "/grades/:*"]
}