import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/user-store";

export async function POST(request: NextRequest) {
  const { email, providerCode } = await request.json();

  if (typeof email !== "string" || typeof providerCode !== "string") {
    return NextResponse.json({ error: "Email address and provider code are required." }, { status: 400 });
  }

  if (!email.trim() || !providerCode.trim()) {
    return NextResponse.json({ error: "Email address and provider code are required." }, { status: 400 });
  }

  try {
    createUser(email, providerCode);
    return NextResponse.json({ ok: true, message: "Account created successfully. Use your email to sign in." }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Invalid provider code.") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message === "Email already exists.") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: error.message || "Failed to create account." }, { status: 400 });
  }
}
