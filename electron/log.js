import fs from "node:fs";
import path from "node:path";
import { app, shell } from "electron";

export const getLogPath = () => path.join(app.getPath("userData"), "sah.log");

export const log = (...parts) => {
  const line = `${new Date().toISOString()} ${parts
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join(" ")}\n`;

  try {
    fs.appendFileSync(getLogPath(), line, { mode: 0o600 });
  } catch {
    // logging must never break the flow
  }
  process.stdout.write(line);
};

export const openLog = async () => {
  const file = getLogPath();
  if (!fs.existsSync(file)) fs.writeFileSync(file, "", { mode: 0o600 });
  await shell.openPath(file);
  return file;
};
