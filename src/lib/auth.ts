import crypto from "crypto";

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export function getAuthConfig() {
  return {
    username: process.env.AUTH_USERNAME || "",
    password: process.env.AUTH_PASSWORD || "",
    sessionSecret: process.env.AUTH_SESSION_SECRET || process.env.AUTH_SECRET || process.env.AUTH_PASSWORD || "",
  };
}

export function createSessionToken(username: string, expiresAt: number, secret: string) {
  const payload = `${username}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const token = Buffer.from(`${payload}:${signature}`).toString("base64url");
  return token;
}

export function verifySessionToken(token: string, secret: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, expiresAt, signature] = decoded.split(":");

    if (!username || !expiresAt || !signature) {
      return null;
    }

    const payload = `${username}:${expiresAt}`;
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const providedBuffer = Buffer.from(signature, "hex");

    if (expectedBuffer.length !== providedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      return null;
    }

    const expiresAtNumber = Number(expiresAt);
    if (Number.isNaN(expiresAtNumber) || Date.now() > expiresAtNumber) {
      return null;
    }

    return {
      username,
      expiresAt: expiresAtNumber,
    };
  } catch {
    return null;
  }
}
