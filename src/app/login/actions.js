// Create cookie when logging in

'use server'

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(prevState, formData) {
    const passwordInput = formData.get("password");
    const secretPassword = process.env.MASTER_PASSWORD;

    if (passwordInput === secretPassword) {
        const cookieStore = await cookies();

        cookieStore.set("app_password", passwordInput, {
            httpOnly: true,
            secure: true,   
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 90, // lasts 90 days logged in
            path: "/",
        });

        redirect("/");
    } else {
        return { error: "Clave incorrecta" }
    }
}