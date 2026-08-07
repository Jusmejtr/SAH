import fs from "node:fs";
import path from "node:path";

const unquote = (token) =>
  token
    .slice(1, -1)
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

const quote = (value) =>
  `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const parseVdf = (text) => {
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}]/g) ?? [];
  let index = 0;

  const parseObject = () => {
    const result = {};
    while (index < tokens.length) {
      if (tokens[index] === "}") {
        index += 1;
        return result;
      }
      const key = unquote(tokens[index]);
      index += 1;
      if (tokens[index] === "{") {
        index += 1;
        result[key] = parseObject();
      } else {
        result[key] = unquote(tokens[index] ?? '""');
        index += 1;
      }
    }
    return result;
  };

  return parseObject();
};

const stringifyVdf = (value, depth = 0) => {
  const indent = "\t".repeat(depth);
  return Object.entries(value)
    .map(([key, entry]) =>
      typeof entry === "object"
        ? `${indent}${quote(key)}\n${indent}{\n${stringifyVdf(entry, depth + 1)}${indent}}\n`
        : `${indent}${quote(key)}\t\t${quote(entry)}\n`,
    )
    .join("");
};

export const applyMostRecentUser = (installDir, username) => {
  const file = path.join(installDir, "config", "loginusers.vdf");

  let root;
  try {
    root = parseVdf(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }

  const users = root.users;
  if (!users || typeof users !== "object") return false;

  let known = false;

  for (const entry of Object.values(users)) {
    if (!entry || typeof entry !== "object") continue;

    const isTarget =
      String(entry.AccountName ?? "").toLowerCase() === username.toLowerCase();

    entry.MostRecent = isTarget ? "1" : "0";
    if (isTarget) {
      known = true;
      entry.AllowAutoLogin = "1";
    }
  }

  fs.writeFileSync(file, stringifyVdf(root), { mode: 0o600 });
  return known;
};
