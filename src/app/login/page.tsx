"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => {
    const nextPath = searchParams.get("next");
    if (nextPath && nextPath.startsWith("/")) {
      return nextPath;
    }
    return "/";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: step === "code" ? code : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Authentication failed.");
        return;
      }

      if (data.requiresCode) {
        setStep("code");
        setCode("");
        setMessage(data.message || "A sign-in code was sent to your email.");
        return;
      }

      window.location.assign(redirectTo);
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background:
        "radial-gradient(circle at top, rgba(255,255,255,0.1), transparent 24%), linear-gradient(180deg, #030712, #01060f)",
      color: "#f8fafc",
    }}>
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "24px",
          border: "1px solid rgba(148,163,184,0.2)",
          background: "rgba(2,6,23,0.72)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.34)",
          padding: "28px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.24em", color: "#93c5fd" }}>
            Fast Chat
          </div>
          <h1 style={{ margin: "10px 0 0", fontSize: "1.9rem" }}>Sign in</h1>
          <p style={{ margin: "10px 0 0", color: "rgba(248,250,252,0.72)", lineHeight: 1.4 }}>
            Enter your email address. We will send a one-time sign-in code to finish access.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "0.78rem", color: "rgba(248,250,252,0.72)" }}>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(148,163,184,0.24)",
                background: "rgba(8,15,30,0.88)",
                color: "#f8fafc",
                padding: "12px 14px",
                fontSize: "0.95rem",
              }}
            />
          </label>

          {step === "code" && (
            <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.78rem", color: "rgba(248,250,252,0.72)" }}>Sign-in code</span>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="Enter 6-digit code"
                style={{
                  borderRadius: "12px",
                  border: "1px solid rgba(148,163,184,0.24)",
                  background: "rgba(8,15,30,0.88)",
                  color: "#f8fafc",
                  padding: "12px 14px",
                  fontSize: "0.95rem",
                }}
              />
            </label>
          )}

          {message && (
            <div
              style={{
                borderRadius: "10px",
                background: "rgba(21,128,61,0.42)",
                border: "1px solid rgba(74,222,128,0.28)",
                color: "#bbf7d0",
                padding: "10px 12px",
                fontSize: "0.78rem",
              }}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              style={{
                borderRadius: "10px",
                background: "rgba(127,29,29,0.5)",
                border: "1px solid rgba(248,113,113,0.32)",
                color: "#fecdd3",
                padding: "10px 12px",
                fontSize: "0.78rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "12px 16px",
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
              background: "linear-gradient(180deg, #60a5fa, #2563eb)",
              color: "#fff",
            }}
          >
            {isSubmitting ? (step === "code" ? "Verifying code..." : "Sending code...") : (step === "code" ? "Verify code" : "Send sign-in code")}
          </button>
        </form>

        <div style={{ marginTop: "14px", textAlign: "center", color: "rgba(248,250,252,0.72)", fontSize: "0.78rem" }}>
          Don’t have an account? <a href="/signup" style={{ color: "#93c5fd", textDecoration: "none", fontWeight: 700 }}>Create one</a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
