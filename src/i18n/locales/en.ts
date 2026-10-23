// Source strings. Every other locale must provide the same keys (TypeScript
// enforces it). Plural keys end in _one / _other; languages with more plural
// forms (Polish, Russian) add _few / _many as well.
// Placeholders use {name} syntax.
const en = {
  // common
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.saveChanges": "Save changes",
  "common.saving": "Saving…",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.done": "Done",
  "common.working": "Working…",
  "common.download": "Download",
  "common.restartInstall": "Restart & install",
  "common.import": "Import",
  "common.export": "Export",
  "common.username": "Username",
  "common.password": "Password",
  "common.sharedSecret": "Shared secret",
  "common.displayName": "Display name",
  "common.displayNameHelp": "Optional label shown on the account card.",
  "common.delimiter": "Delimiter",
  "common.delimiterColon": "Colon (:)",
  "common.delimiterSemicolon": "Semicolon (;)",
  "common.delimiterComma": "Comma (,)",
  "common.delimiterPipe": "Pipe (|)",
  "common.delimiterTab": "Tab",
  "common.delimiterCustom": "Custom",
  "common.customDelimiter": "Custom delimiter",
  "common.customDelimiterHelp": "Use a single character, e.g. #",
  "common.columnOrder": "Column order",
  "common.selectDelimiter": "Select a delimiter.",

  // column names used in the import / export column order
  "column.username": "username",
  "column.password": "password",
  "column.sharedSecret": "shared secret",
  "column.displayName": "display name",

  // main window
  "app.loginSignedIn": "Credentials and Steam Guard code submitted.",
  "app.loginAutoLogin": "Steam resumed the saved session for this account.",
  "app.loginLaunched":
    "Credentials submitted. No shared secret stored, enter the code manually.",
  "app.loginCodeCopied": "Steam started. Guard code copied to the clipboard.",
  "app.loginCancelled": "Login cancelled.",
  "app.maFileSaved": "maFile saved.",
  "app.accountUpdated": "Account updated.",
  "app.accountDeleted": "Account deleted.",
  "app.noAccountsToImport": "No accounts to import.",
  "app.imported_one": "Imported {count} account.",
  "app.imported_other": "Imported {count} accounts.",
  "app.importSkipped_one":
    "Skipped {count} account during import. First error: {error}",
  "app.importSkipped_other":
    "Skipped {count} accounts during import. First error: {error}",
  "app.dismissError": "Dismiss error",
  "app.emptyTitle": "No accounts yet",
  "app.emptySubtitle": "Add an account or import a list to get started.",
  "app.noMatchesTitle": "No matches",
  "app.noMatchesSubtitle": "Nothing found for “{query}”.",
  "app.deleteAuthenticatorWarning":
    "Its Steam Guard authenticator was set up here. Save the maFile first (right-click → Save maFile…), or you will need the revocation code to sign in.",

  // top bar
  "nav.noAccounts": "No accounts stored",
  "nav.accountsStored_one": "{count} account stored",
  "nav.accountsStored_other": "{count} accounts stored",
  "nav.searchPlaceholder": "Search accounts…",
  "nav.clearSearch": "Clear search",
  "nav.lightMode": "Light mode",
  "nav.darkMode": "Dark mode",
  "nav.toggleColorMode": "Toggle color mode",
  "nav.settings": "Settings",
  "nav.language": "Language",
  "nav.systemLanguage": "System default",
  "nav.manage": "Manage",
  "nav.selectAll": "Select all",
  "nav.clearSelection": "Clear selection",
  "nav.selected_one": "{count} selected",
  "nav.selected_other": "{count} selected",

  // account card
  "card.showGuardCode": "Show Steam Guard code",
  "card.signingIn": "Signing in…",
  "card.setupGuard": "Set up Steam Guard…",
  "card.saveMaFile": "Save maFile…",

  // footer
  "footer.idle": "Idle",
  "footer.log": "Log",

  // delete confirmation
  "delete.titleOne": "Delete this account?",
  "delete.titleMany": "Delete selected accounts?",
  "delete.bodyNamed":
    "This will permanently delete “{name}”. This action cannot be undone.",
  "delete.bodySelected_one":
    "This will permanently delete {count} selected account. This action cannot be undone.",
  "delete.bodySelected_other":
    "This will permanently delete {count} selected accounts. This action cannot be undone.",

  // updates
  "update.bannerReady": "v{version} is ready to install.",
  "update.bannerReadyGeneric": "A new version is ready to install.",
  "update.bannerDownloading": "Downloading v{version}… {percent}%",
  "update.bannerDownloadingGeneric": "Downloading the update… {percent}%",
  "update.bannerAvailable": "v{version} is available.",
  "update.bannerAvailableGeneric": "A new version is available.",
  "update.dismiss": "Dismiss update",
  "update.checking": "Checking for updates…",
  "update.upToDate": "You are on the latest version.",
  "update.available": "A new version is available (v{version}).",
  "update.downloading": "Downloading v{version} — {percent}%",
  "update.downloaded": "Update downloaded and ready to install (v{version}).",
  "update.checkFailed": "Could not check for updates.",
  "update.autoCheck": "Updates are checked automatically.",
  "update.checkNow": "Check now",

  // settings
  "settings.title": "Settings",
  "settings.window": "Window",
  "settings.width": "Width",
  "settings.height": "Height",
  "settings.startMaximized": "Start maximized",
  "settings.startMaximizedHelp": "Ignore the size above and open full screen.",
  "settings.updates": "Updates",
  "settings.version": "Version {version}",

  // Steam Guard code dialog
  "guard.title": "Steam Guard code",
  "guard.clickToCopy": "Click to copy",
  "guard.timeLeft": "Time until the code changes",
  "guard.seconds": "{seconds}s",
  "guard.newCodeEvery": "A new code is generated every 30 seconds.",
  "guard.copyCode": "Copy code",

  // Steam Guard setup dialog
  "setup.title": "Set up Steam Guard",
  "setup.signingIn": "Signing in to Steam…",
  "setup.checkingCode": "Checking the code…",
  "setup.activating": "Activating the authenticator…",
  "setup.savedTo": "Saved to {path}",
  "setup.intro":
    "This signs in to the account with its saved password and adds a Steam Guard Mobile Authenticator, the same way the Steam mobile app does. Afterwards the codes are generated here.",
  "setup.introEmail":
    "Have the account's email open. Steam may send a sign-in code, and sends the activation code there (or by SMS if a phone is linked).",
  "setup.introRevocation":
    "You will get a revocation code. Write it down, it is the only way to remove the authenticator if you lose this app's data.",
  "setup.introMobileApp":
    "The Steam mobile app can't be the authenticator for this account at the same time.",
  "setup.emailSent":
    "Steam sent a sign-in code to the account's email. Enter it to continue.",
  "setup.emailSentDomain":
    "Steam sent a sign-in code to the account's email (…@{domain}). Enter it to continue.",
  "setup.emailCodeLabel": "Code from email",
  "setup.step1": "1. Save your revocation code",
  "setup.copyRevocation": "Copy revocation code",
  "setup.revocationHelp":
    "You need it to remove the authenticator if you ever lose access to this app or this computer.",
  "setup.revocationConfirm": "I wrote down the revocation code",
  "setup.step2": "2. Enter the activation code",
  "setup.sentBySms": "Steam sent it by SMS to the phone ending in {phone}.",
  "setup.sentByEmail": "Steam sent it to the account's email.",
  "setup.activationLabel": "Activation code",
  "setup.doneTitle": "Steam Guard is on",
  "setup.doneBody":
    "Codes for this account are now generated by Steam Account Helper. Save a maFile backup somewhere safe. It holds the secrets and the revocation code, and other tools can import it.",
  "setup.saveMaFileBackup": "Save maFile backup",
  "setup.start": "Start",
  "setup.tryAgain": "Try again",
  "setup.continue": "Continue",
  "setup.activate": "Activate",

  // add account
  "add.button": "Add account",
  "add.title": "Add Steam account",
  "add.setupInfo":
    "Only the username and password are needed. After adding, the app signs in and sets up a Steam Guard Mobile Authenticator for the account.",
  "add.sharedSecretHelp":
    "Used to generate Steam Guard codes. Leave empty if the account has no mobile authenticator.",
  "add.adding": "Adding…",
  "add.addAndSetup": "Add & set up",

  // edit account
  "edit.title": "Edit account",
  "edit.passwordHelp": "Leave empty to keep the current password.",
  "edit.sharedSecretHelp": "Leave empty to keep the current shared secret.",

  // export
  "export.title": "Export accounts",
  "export.warning":
    "The exported file contains plain-text passwords and shared secrets. Store it somewhere safe.",
  "export.exporting": "Exporting…",

  // import
  "import.title": "Import accounts",
  "import.tabText": "Text list",
  "import.tabMaFile": ".maFile",
  "import.notJson": "File is not valid JSON.",
  "import.missingAccountName": "Missing account_name.",
  "import.missingSharedSecretField": "Missing shared_secret.",
  "import.expectedValues": "Expected {expected} values, got {actual}.",
  "import.missingUserPass": "Missing username or password.",
  "import.missingSecret": "Missing shared secret.",
  "import.selectFile": "Select a file with account entries first.",
  "import.fileEmpty": "The selected file is empty.",
  "import.lineTooFew":
    "Line {line}: expected at least {expected} values, found {actual}.",
  "import.lineMissingUserPass": "Line {line} is missing username or password.",
  "import.lineMissingSecret": "Line {line} is missing shared secret.",
  "import.selectMaFile": "Select at least one .maFile.",
  "import.passwordRequired": "{file}: password is required.",
  "import.chooseFile": "Choose a file",
  "import.fileHint": "One account per line, separated by the delimiter below.",
  "import.preview": "Preview",
  "import.lines_one": "{count} line",
  "import.lines_other": "{count} lines",
  "import.issues_one": "{count} issue",
  "import.issues_other": "{count} issues",
  "import.noUsername": "(no username)",
  "import.rowSummary": "password {password} · secret {secret}",
  "import.showingFirst": "Showing the first {shown} of {count} lines.",
  "import.maFilesSelected_one": "{count} .maFile selected",
  "import.maFilesSelected_other": "{count} .maFiles selected",
  "import.chooseMaFiles": "Choose .maFile files",
  "import.maFileHint":
    "Steam Desktop Authenticator files. Passwords are not stored in .maFile, so enter them below.",
  "import.secretOk": "secret ok",
  "import.importing": "Importing…",
  "import.importCount": "Import {count}",

  // login progress reported by the main process
  "progress.locating": "Locating Steam",
  "progress.closing": "Closing running Steam",
  "progress.preparing": "Preparing Steam",
  "progress.starting": "Starting Steam",
  "progress.waiting": "Waiting for the sign-in page",
  "progress.choosingAccount": "Choosing the account",
  "progress.enteringCredentials": "Entering credentials",
  "progress.switchingToCode": "Switching to Steam Guard code",
  "progress.enteringCode": "Entering Steam Guard code",

  // errors reported by the main process
  "backend.cancelled": "Cancelled.",
  "backend.noEncryption":
    "OS credential storage is unavailable, refusing to store secrets.",
  "backend.accountNotFound": "Account not found.",
  "backend.noAuthenticatorData":
    "No authenticator data is stored for this account.",
  "backend.usernameRequired": "Username is required.",
  "backend.passwordRequired": "Password is required.",
  "backend.duplicateUsername": "An account with this username already exists.",
  "backend.exportDelimiterRequired": "Delimiter is required for export.",
  "backend.exportInvalidLayout": "Invalid export column order.",
  "backend.exportNoAccounts": "No accounts available to export.",
  "backend.noSharedSecretStored": "This account has no shared secret stored.",
  "backend.noSharedSecret": "Account has no shared secret.",
  "backend.invalidSharedSecret": "Shared secret is not a valid Steam secret.",
  "backend.windowsOnly": "Automatic Steam login is supported on Windows only.",
  "backend.steamNotFound": "Steam installation was not found.",
  "backend.githubStatus": "GitHub responded with {status}.",
  "backend.releaseTooLarge": "Release metadata is too large.",
  "backend.releaseUnreadable": "Could not read release metadata.",
  "backend.updateTimeout": "Update check timed out.",
  "backend.updateFailed": "Update failed.",
  "backend.hasAuthenticator":
    "This account already has a Steam Guard Mobile Authenticator (for example in the Steam mobile app). Remove it there first, or import its maFile instead.",
  "backend.steamTimeout": "Steam did not respond in time. Try again.",
  "backend.wrongPassword": "Wrong username or password.",
  "backend.signInRateLimit":
    "Steam is rate limiting sign-ins from this network. Wait a while (up to an hour) and try again.",
  "backend.accountDisabled": "Steam says this account is disabled.",
  "backend.signInFailed": "Steam sign-in failed: {detail}",
  "backend.addFail":
    "Steam refused to add an authenticator (Fail). Steam doesn't send a reason with this error.\n• Most often the account has no phone number. Add and verify one in Steam → Account details, then try again.\n• Check that the account's email address is verified.\n• If the email, password or phone was changed very recently, Steam may block this for a while. Try again later.",
  "backend.addRateLimit":
    "Steam is rate limiting authenticator requests for this account. Wait a few hours and try again.",
  "backend.accessDenied":
    "Steam denied access. The account may be locked or limited, check its status on the Steam website.",
  "backend.addRefused": "Steam refused to add an authenticator ({result}).",
  "backend.addRequestFailed": "Could not request an authenticator: {detail}",
  "backend.emailCodeRejected":
    "That code was not accepted. Check the newest email from Steam and try again.",
  "backend.sessionExpired": "The setup session has expired. Start again.",
  "backend.enterActivationCode": "Enter the activation code.",
  "backend.wrongActivationCode":
    "That activation code is wrong. Check it and try again.",
  "backend.activationFailed": "Steam did not accept the activation: {detail}",
} as const;

export default en;
