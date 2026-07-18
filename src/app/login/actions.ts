"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/session";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    throw new Error("AUTH_PASSWORD is not set.");
  }

  if (!safeEqual(password, expected)) {
    redirect("/login?error=1");
  }

  await setSessionCookie();
  redirect("/");
}
