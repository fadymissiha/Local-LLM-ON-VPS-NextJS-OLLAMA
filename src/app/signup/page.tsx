"use client";

import { Suspense, useState, type FormEvent } from "react";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, providerCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create account.");
        return;
      }

      setSuccess("Account created. You can now sign in with your email.");
      setEmail("");
      setProviderCode("");
    } catch {
      setError("Unable to create account right now.");
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
          <h1 style={{ margin: "10px 0 0", fontSize: "1.9rem" }}>Create account</h1>
          <p style={{ margin: "10px 0 0", color: "rgba(248,250,252,0.72)", lineHeight: 1.4 }}>
            Create a user account with email-based sign-in. Use the configured provider code to register.
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

          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "0.78rem", color: "rgba(248,250,252,0.72)" }}>Provider code</span>
            <input
              type="text"
              value={providerCode}
              onChange={(event) => setProviderCode(event.target.value)}
              autoComplete="off"
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

          {success && (
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
              {success}
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: "14px", textAlign: "center", color: "rgba(248,250,252,0.72)", fontSize: "0.78rem" }}>
          Already have an account? <a href="/login" style={{ color: "#93c5fd", textDecoration: "none", fontWeight: 700 }}>Sign in</a>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
