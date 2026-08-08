import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { app, safeStorage } from "electron";

const getAccountsFilePath = () => path.join(app.getPath("userData"), "accounts.json");
const getSettingsFilePath = () => path.join(app.getPath("userData"), "settings.json");

const readRaw = () => {
  try {
    const content = fs.readFileSync(getAccountsFilePath(), "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeRaw = (accounts) => {
  const file = getAccountsFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(accounts, null, 2), { mode: 0o600 });
};

const readSettingsRaw = () => {
  try {
    const content = fs.readFileSync(getSettingsFilePath(), "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

const writeSettingsRaw = (settings) => {
  const file = getSettingsFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2), { mode: 0o600 });
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
    displayName: account.displayName ?? "",
    password: decrypt(account.password),
    sharedSecret: account.sharedSecret ? decrypt(account.sharedSecret) : "",
  };
};

export const getSettings = () => ({
  width: Number(readSettingsRaw().width ?? 800),
  height: Number(readSettingsRaw().height ?? 600),
  maximize: Boolean(readSettingsRaw().maximize),
});

export const setSettings = (settings) => {
  const nextSettings = {
    width: Number(settings.width ?? 800),
    height: Number(settings.height ?? 600),
    maximize: Boolean(settings.maximize),
  };
  writeSettingsRaw(nextSettings);
  return nextSettings;
};
