import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { app, safeStorage } from "electron";

const getFilePath = () => path.join(app.getPath("userData"), "accounts.json");

const readRaw = () => {
  try {
    const content = fs.readFileSync(getFilePath(), "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeRaw = (accounts) => {
  const file = getFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(accounts, null, 2), { mode: 0o600 });
};

const assertEncryptionAvailable = () => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "OS credential storage is unavailable, refusing to store secrets.",
    );
  }
};

const encrypt = (value) =>
  safeStorage.encryptString(String(value)).toString("base64");

const decrypt = (value) =>
  safeStorage.decryptString(Buffer.from(String(value), "base64"));

const toPublic = (account) => ({
  id: account.id,
  username: account.username,
  displayName: account.displayName ?? "",
});

export const listAccounts = () => readRaw().map(toPublic);

export const addAccount = ({
  username,
  password,
  sharedSecret,
  displayName,
}) => {
  assertEncryptionAvailable();

  const trimmedUsername = String(username ?? "").trim();
  if (!trimmedUsername) throw new Error("Username is required.");
  if (!password) throw new Error("Password is required.");

  const accounts = readRaw();
  if (
    accounts.some(
      (item) => item.username.toLowerCase() === trimmedUsername.toLowerCase(),
    )
  ) {
    throw new Error("An account with this username already exists.");
  }

  const account = {
    id: crypto.randomUUID(),
    username: trimmedUsername,
    displayName: String(displayName ?? "").trim(),
    password: encrypt(password),
    sharedSecret: sharedSecret ? encrypt(sharedSecret) : "",
  };

  accounts.push(account);
  writeRaw(accounts);
  return toPublic(account);
};

export const removeAccount = (id) => {
  const accounts = readRaw();
  const next = accounts.filter((account) => account.id !== id);
  writeRaw(next);
  return next.map(toPublic);
};

export const getSecrets = (id) => {
  assertEncryptionAvailable();
  const account = readRaw().find((item) => item.id === id);
  if (!account) throw new Error("Account not found.");
  return {
    username: account.username,
    password: decrypt(account.password),
    sharedSecret: account.sharedSecret ? decrypt(account.sharedSecret) : "",
  };
};
