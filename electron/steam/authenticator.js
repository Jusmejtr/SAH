// Sets up a Steam Guard Mobile Authenticator for a stored account the same
// way the Steam mobile app does: sign in as the mobile app, request a new
// authenticator, then confirm it with the activation code Steam sends by
// SMS or email.
import SteamCommunity from "steamcommunity";
import SteamTotp from "steam-totp";
import { log } from "../log.js";
import { completeAuthenticator, savePendingAuthenticator } from "../store.js";

const { EResult } = SteamCommunity;
const STEP_TIMEOUT_MS = 60000;

const HAS_AUTHENTICATOR =
  "This account already has a Steam Guard Mobile Authenticator (for example in the Steam mobile app). Remove it there first, or import its maFile instead.";

let session = null;

const resultName = (value) => EResult[value] ?? String(value);

const withTimeout = (promise) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Steam did not respond in time. Try again.")),
      STEP_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const signIn = (community, details) =>
  withTimeout(
    new Promise((resolve, reject) =>
      community.login(details, (error) => (error ? reject(error) : resolve())),
    ),
  );

const addAuthenticator = (community) =>
  withTimeout(
    new Promise((resolve, reject) =>
      community.enableTwoFactor((error, response) =>
        error ? reject(error) : resolve(response),
      ),
    ),
  );

const confirmAuthenticator = (community, sharedSecret, activationCode) =>
  withTimeout(
    new Promise((resolve, reject) =>
      community.finalizeTwoFactor(sharedSecret, activationCode, (error) =>
        error ? reject(error) : resolve(),
      ),
    ),
  );

const signInErrorMessage = (error) => {
  switch (error?.eresult) {
    case EResult.InvalidPassword:
      return "Wrong username or password.";
    case EResult.RateLimitExceeded:
    case EResult.AccountLoginDeniedThrottle:
      return "Steam is rate limiting sign-ins from this network. Wait a while (up to an hour) and try again.";
    case EResult.AccountDisabled:
    case EResult.Banned:
      return "Steam says this account is disabled.";
    default:
      return `Steam sign-in failed: ${error?.message ?? error}`;
  }
};

const addErrorMessage = (error) => {
  switch (error?.eresult) {
    case EResult.Fail:
      return [
        "Steam refused to add an authenticator (Fail). Steam doesn't send a reason with this error.",
        "• Most often the account has no phone number. Add and verify one in Steam → Account details, then try again.",
        "• Check that the account's email address is verified.",
        "• If the email, password or phone was changed very recently, Steam may block this for a while. Try again later.",
      ].join("\n");
    case EResult.DuplicateRequest:
      return HAS_AUTHENTICATOR;
    case EResult.RateLimitExceeded:
      return "Steam is rate limiting authenticator requests for this account. Wait a few hours and try again.";
    case EResult.AccessDenied:
      return "Steam denied access. The account may be locked or limited, check its status on the Steam website.";
    default:
      return error?.eresult
        ? `Steam refused to add an authenticator (${resultName(error.eresult)}).`
        : `Could not request an authenticator: ${error?.message ?? error}`;
  }
};

const fail = (target, message) => {
  log("guard-setup: error", message.split("\n")[0]);
  if (session === target) session = null;
  return { step: "error", message };
};

const cancelled = () => ({ step: "error", message: "Cancelled." });

const activationStep = (response, extra = {}) => ({
  step: "activation",
  revocationCode: response.revocation_code,
  phoneHint: response.phone_number_hint ?? "",
  ...extra,
});

const requestAuthenticator = async (target) => {
  let response;
  try {
    response = await addAuthenticator(target.community);
  } catch (error) {
    if (target.closed) return cancelled();
    return fail(target, addErrorMessage(error));
  }
  if (target.closed) return cancelled();

  const steamId = target.community.steamID;
  target.response = {
    ...response,
    account_name: response.account_name ?? target.username,
    device_id: SteamTotp.getDeviceID(steamId),
    steamid: steamId.getSteamID64(),
  };

  // Persist right away: if the app dies before finalizing, the secrets Steam
  // just issued are not lost.
  savePendingAuthenticator(target.accountId, target.response);
  log("guard-setup: step activation");
  return activationStep(target.response);
};

const signInAndRequest = async (target, emailCode) => {
  try {
    await signIn(target.community, {
      accountName: target.username,
      password: target.password,
      disableMobile: false,
      ...(emailCode ? { authCode: emailCode } : {}),
    });
  } catch (error) {
    if (target.closed) return cancelled();

    if (error?.message === "SteamGuard") {
      log("guard-setup: step email-code");
      return {
        step: "email-code",
        domain: error.emaildomain ?? "",
        error: emailCode
          ? "That code was not accepted. Check the newest email from Steam and try again."
          : "",
      };
    }
    if (error?.message === "SteamGuardMobile") {
      return fail(target, HAS_AUTHENTICATOR);
    }
    return fail(target, signInErrorMessage(error));
  }

  if (target.closed) return cancelled();
  log("guard-setup: signed in");
  return requestAuthenticator(target);
};

export const startGuardSetup = (accountId, credentials) => {
  cancelGuardSetup();

  const target = {
    accountId,
    username: credentials.username,
    password: credentials.password,
    community: new SteamCommunity(),
    response: null,
    closed: false,
  };
  session = target;

  log("guard-setup: signing in", credentials.username);
  return signInAndRequest(target);
};

export const submitGuardEmailCode = (code) => {
  const target = session;
  if (!target || target.response) {
    return { step: "error", message: "The setup session has expired. Start again." };
  }
  return signInAndRequest(target, String(code ?? "").trim().toUpperCase());
};

export const finalizeGuardSetup = async (activationCode) => {
  const target = session;
  if (!target?.response) {
    return { step: "error", message: "The setup session has expired. Start again." };
  }

  const code = String(activationCode ?? "").trim();
  if (!code) {
    return activationStep(target.response, { error: "Enter the activation code." });
  }

  try {
    await confirmAuthenticator(
      target.community,
      target.response.shared_secret,
      code,
    );
  } catch (error) {
    if (target.closed) return cancelled();
    log("guard-setup: finalize failed", error.message);
    const message = /invalid activation code/i.test(error.message)
      ? "That activation code is wrong. Check it and try again."
      : `Steam did not accept the activation: ${error.message}`;
    return activationStep(target.response, { error: message });
  }

  const account = completeAuthenticator(target.accountId, {
    ...target.response,
    fully_enrolled: true,
  });
  log("guard-setup: authenticator enabled for", target.username);
  if (session === target) session = null;
  return { step: "done", account };
};

export const cancelGuardSetup = () => {
  if (session) {
    log("guard-setup: cancelled");
    session.closed = true;
    session = null;
  }
  return true;
};
