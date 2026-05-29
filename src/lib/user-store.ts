import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface StoredUser {
  email: string;
  createdAt: string;
}

export interface LoginCodeRecord {
  email: string;
  code: string;
  expiresAt: number;
}

export interface UserRecord extends StoredUser {}

function getUsersFilePath() {
  return process.env.AUTH_USERS_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "users.json");
}

function getLoginCodesFilePath() {
  return process.env.AUTH_LOGIN_CODES_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "login-codes.json");
}

function ensureFileExists(filePath: string, defaultContents: unknown) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContents, null, 2), "utf8");
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  ensureFileExists(filePath, defaultValue);
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(fileContents);
    return parsed as T;
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, value: T) {
  ensureFileExists(filePath, value);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readUsersFile(): StoredUser[] {
  return readJsonFile<StoredUser[]>(getUsersFilePath(), []);
}

function writeUsersFile(users: StoredUser[]) {
  writeJsonFile(getUsersFilePath(), users);
}

function readLoginCodesFile(): LoginCodeRecord[] {
  return readJsonFile<LoginCodeRecord[]>(getLoginCodesFilePath(), []);
}

function writeLoginCodesFile(codes: LoginCodeRecord[]) {
  writeJsonFile(getLoginCodesFilePath(), codes);
}

export function listUsers() {
  return readUsersFile();
}

export function findUser(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = readUsersFile();
  return (
    users.find((user) => {
      if (user.email) {
        return user.email === normalizedEmail;
      }
      // Support legacy users with 'username' field
      if ((user as any).username) {
        return (user as any).username.toLowerCase() === normalizedEmail;
      }
      return false;
    }) || null
  );
}

export function createUser(email: string, providerCode: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("A valid email address is required.");
  }

  const configuredProviderCode = process.env.AUTH_SIGNUP_CODE?.trim();
  if (!configuredProviderCode) {
    throw new Error("Signup provider code is not configured.");
  }

  if (providerCode.trim() !== configuredProviderCode) {
    throw new Error("Invalid provider code.");
  }

  const users = readUsersFile();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Email already exists.");
  }

  const user = {
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsersFile(users);
  return user;
}

export function createLoginCode(email: string, code: string, expiresInMs = 15 * 60 * 1000) {
  const normalizedEmail = normalizeEmail(email);
  const records = readLoginCodesFile();
  const expiresAt = Date.now() + expiresInMs;

  const cleanedRecords = records.filter((record) => record.email !== normalizedEmail || record.expiresAt > Date.now());
  cleanedRecords.push({
    email: normalizedEmail,
    code,
    expiresAt,
  });

  writeLoginCodesFile(cleanedRecords);
  return { email: normalizedEmail, code, expiresAt };
}

export function consumeLoginCode(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const records = readLoginCodesFile();
  const now = Date.now();

  const matchingRecord = records.find((record) => record.email === normalizedEmail && record.code === code && record.expiresAt > now);
  if (!matchingRecord) {
    return false;
  }

  const remainingRecords = records.filter((record) => record !== matchingRecord);
  writeLoginCodesFile(remainingRecords);
  return true;
}

export function generateVerificationCode() {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString().padStart(6, "0");
}
