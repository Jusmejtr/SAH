// The Electron main process reports errors and login progress in English (so
// the log file stays readable). These tables map those messages to
// translation keys. When you change a message in electron/, update it here.
import type { MessageKey } from "./index";

export const BACKEND_EXACT: Record<string, MessageKey> = {
  // electron/steam/index.js (login progress)
  "Locating Steam": "progress.locating",
  "Closing running Steam": "progress.closing",
  "Preparing Steam": "progress.preparing",
  "Starting Steam": "progress.starting",
  "Waiting for the sign-in page": "progress.waiting",
  "Choosing the account": "progress.choosingAccount",
  "Entering credentials": "progress.enteringCredentials",
  "Switching to Steam Guard code": "progress.switchingToCode",
  "Entering Steam Guard code": "progress.enteringCode",

  // electron/errors.js
  "Cancelled.": "backend.cancelled",

  // electron/store.js
  "OS credential storage is unavailable, refusing to store secrets.":
    "backend.noEncryption",
  "Account not found.": "backend.accountNotFound",
  "No authenticator data is stored for this account.":
    "backend.noAuthenticatorData",
  "Username is required.": "backend.usernameRequired",
  "Password is required.": "backend.passwordRequired",
  "An account with this username already exists.": "backend.duplicateUsername",
  "Delimiter is required for export.": "backend.exportDelimiterRequired",
  "Invalid export column order.": "backend.exportInvalidLayout",
  "No accounts available to export.": "backend.exportNoAccounts",

  // electron/main.js, electron/steam/guard.js
  "This account has no shared secret stored.": "backend.noSharedSecretStored",
  "Account has no shared secret.": "backend.noSharedSecret",
  "Shared secret is not a valid Steam secret.": "backend.invalidSharedSecret",

  // electron/steam/process.js
  "Automatic Steam login is supported on Windows only.": "backend.windowsOnly",
  "Steam installation was not found.": "backend.steamNotFound",

  // electron/updater.js
  "Release metadata is too large.": "backend.releaseTooLarge",
  "Could not read release metadata.": "backend.releaseUnreadable",
  "Update check timed out.": "backend.updateTimeout",
  "Update failed.": "backend.updateFailed",

  // electron/steam/authenticator.js
  "This account already has a Steam Guard Mobile Authenticator (for example in the Steam mobile app). Remove it there first, or import its maFile instead.":
    "backend.hasAuthenticator",
  "Steam did not respond in time. Try again.": "backend.steamTimeout",
  "Wrong username or password.": "backend.wrongPassword",
  "Steam is rate limiting sign-ins from this network. Wait a while (up to an hour) and try again.":
    "backend.signInRateLimit",
  "Steam says this account is disabled.": "backend.accountDisabled",
  "Steam is rate limiting authenticator requests for this account. Wait a few hours and try again.":
    "backend.addRateLimit",
  "Steam denied access. The account may be locked or limited, check its status on the Steam website.":
    "backend.accessDenied",
  "That code was not accepted. Check the newest email from Steam and try again.":
    "backend.emailCodeRejected",
  "The setup session has expired. Start again.": "backend.sessionExpired",
  "Enter the activation code.": "backend.enterActivationCode",
  "That activation code is wrong. Check it and try again.":
    "backend.wrongActivationCode",
};

export const BACKEND_PATTERNS: {
  pattern: RegExp;
  key: MessageKey;
  param?: string;
}[] = [
  // multi-line message, match on its first line
  {
    pattern: /^Steam refused to add an authenticator \(Fail\)\./,
    key: "backend.addFail",
  },
  {
    pattern: /^Steam refused to add an authenticator \((\w+)\)\.$/,
    key: "backend.addRefused",
    param: "result",
  },
  {
    pattern: /^Steam sign-in failed: ([\s\S]*)$/,
    key: "backend.signInFailed",
    param: "detail",
  },
  {
    pattern: /^Could not request an authenticator: ([\s\S]*)$/,
    key: "backend.addRequestFailed",
    param: "detail",
  },
  {
    pattern: /^Steam did not accept the activation: ([\s\S]*)$/,
    key: "backend.activationFailed",
    param: "detail",
  },
  {
    pattern: /^GitHub responded with (\d+)\.$/,
    key: "backend.githubStatus",
    param: "status",
  },
];
