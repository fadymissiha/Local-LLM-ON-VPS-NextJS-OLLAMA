import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getAuthConfig, SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth";
import { sendVerificationCode } from "@/lib/email";
import { consumeLoginCode, createLoginCode, findUser, generateVerificationCode } from "@/lib/user-store";

export async function POST(request: NextRequest) {
  const { email, code } = await request.json();
  const { sessionSecret } = getAuthConfig();

  if (!sessionSecret) {
    return NextResponse.json(
      {
        error: "Authentication is not configured. Set AUTH_SESSION_SECRET.",
      },
      { status: 500 }
    );
  }

  if (typeof email !== "string") {
    return NextResponse.json({ error: "An email address is required." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: "An email address is required." }, { status: 400 });
  }

  const storedUser = findUser(normalizedEmail);
  if (!storedUser) {
    return NextResponse.json({ error: "No account found. Sign up first." }, { status: 404 });
  }

  if (typeof code !== "string" || !code.trim()) {
    const verificationCode = generateVerificationCode();
    createLoginCode(normalizedEmail, verificationCode);

    try {
      await sendVerificationCode(normalizedEmail, verificationCode);
    } catch (error) {
      console.error("Failed to send sign-in code", error);
      const errorMessage = error instanceof Error ? error.message : "Unable to send the sign-in code right now.";
      return NextResponse.json({
        error: errorMessage,
      }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        requiresCode: true,
        message: "A sign-in code was sent to your email.",
      },
      { status: 200 }
    );
  }

  const isValidCode = consumeLoginCode(normalizedEmail, code.trim());
  if (!isValidCode) {
    return NextResponse.json({ error: "The sign-in code is invalid or expired." }, { status: 401 });
  }

  return createSessionResponse(normalizedEmail, sessionSecret);
}

function createSessionResponse(email: string, sessionSecret: string) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  const token = createSessionToken(email, expiresAt, sessionSecret);

  const response = NextResponse.json({ ok: true, redirectTo: "/" }, { status: 200 });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return response;
}
