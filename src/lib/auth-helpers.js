import { auth } from "../auth.js";

export async function isLoggedIn() {
  const session = await auth();
  return !!session?.user;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }
  return parseInt(user.id);
}
