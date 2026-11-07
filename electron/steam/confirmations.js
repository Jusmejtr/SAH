// Mobile confirmations (trades, market listings, account changes) the same
// way the Steam mobile app handles them: sign in as the mobile app with the
// password and a Steam Guard code, then sign each request with the
// identity secret.
import SteamCommunity from "steamcommunity";
import SteamTotp from "steam-totp";
import { log } from "../log.js";
import { generateGuardCode } from "./guard.js";
import { signInErrorMessage, withTimeout } from "./authenticator.js";

const NO_IDENTITY_SECRET =
  "This account has no identity secret stored. Add it in Edit, or import the account's maFile.";
const NO_SHARED_SECRET_FOR_CONF =
  "Confirmations need the account's shared secret to sign in.";
const EMAIL_GUARD =
  "This account uses email Steam Guard. Confirmations need a mobile authenticator.";
const CODE_REJECTED =
  "Steam did not accept the Steam Guard code. Check the shared secret and the computer's clock.";
const LIST_FAILED =
  "Steam did not return the confirmations. Check that the identity secret is correct.";

// accountId -> { community, used: number[] }
const sessions = new Map();
let timeOffset = null;

const getTimeOffset = () =>
  timeOffset !== null
    ? Promise.resolve(timeOffset)
    : new Promise((resolve) => {
        SteamTotp.getTimeOffset((error, offset) => {
          if (error) {
            log("confirmations: time offset unavailable", error.message);
            resolve(0);
            return;
          }
          timeOffset = offset;
          resolve(offset);
        });
      });

const call = (fn) =>
  withTimeout(
    new Promise((resolve, reject) => {
      try {
        fn((error, value) => (error ? reject(error) : resolve(value)));
      } catch (error) {
        reject(error);
      }
    }),
  );

// Steam rejects a confirmation key whose timestamp was already used.
const nextTime = (session, offset) => {
  let time = SteamTotp.time(offset);
  while (session.used.includes(time)) time += 1;
  session.used.push(time);
  if (session.used.length > 60) session.used.splice(0, session.used.length - 60);
  return time;
};

const signIn = async (secrets, offset) => {
  const community = new SteamCommunity();
  try {
    await call((done) =>
      community.login(
        {
          accountName: secrets.username,
          password: secrets.password,
          twoFactorCode: generateGuardCode(
            secrets.sharedSecret,
            Date.now() + offset * 1000,
          ),
          disableMobile: false,
        },
        (error) => done(error),
      ),
    );
  } catch (error) {
    if (error?.message === "SteamGuardMobile") throw new Error(CODE_REJECTED);
    if (error?.message === "SteamGuard") throw new Error(EMAIL_GUARD);
    if (/did not respond in time/.test(error?.message ?? "")) throw error;
    throw new Error(signInErrorMessage(error));
  }
  log("confirmations: signed in", secrets.username);
  return { community, used: [] };
};

const needsNewSession = (error) =>
  /not logged in|needauth|must be logged in/i.test(error?.message ?? "");

const withSession = async (accountId, secrets, action) => {
  if (!secrets.identitySecret) throw new Error(NO_IDENTITY_SECRET);
  if (!secrets.sharedSecret) throw new Error(NO_SHARED_SECRET_FOR_CONF);

  const offset = await getTimeOffset();
  const cached = sessions.get(accountId);
  if (cached) {
    try {
      return await action(cached, offset);
    } catch (error) {
      if (!needsNewSession(error)) throw error;
      log("confirmations: session expired, signing in again");
      sessions.delete(accountId);
    }
  }

  const session = await signIn(secrets, offset);
  sessions.set(accountId, session);
  return action(session, offset);
};

const splitTitle = (title) => {
  const index = title.indexOf(" - ");
  return index < 0
    ? { typeName: title, headline: "" }
    : { typeName: title.slice(0, index), headline: title.slice(index + 3) };
};

export const listConfirmations = (accountId, secrets) =>
  withSession(accountId, secrets, async (session, offset) => {
    const time = nextTime(session, offset);
    const key = SteamTotp.getConfirmationKey(secrets.identitySecret, time, "list");
    let confirmations;
    try {
      confirmations = await call((done) =>
        session.community.getConfirmations(time, { tag: "list", key }, done),
      );
    } catch (error) {
      if (needsNewSession(error)) throw error;
      log("confirmations: list failed", error?.message);
      if (/failed to get confirmation list/i.test(error?.message ?? "")) {
        throw new Error(LIST_FAILED);
      }
      throw new Error(`Could not load confirmations: ${error?.message ?? error}`);
    }

    log("confirmations: loaded", confirmations.length);
    return confirmations.map((item) => ({
      id: item.id,
      key: item.key,
      type: Number(item.type) || 0,
      ...splitTitle(String(item.title ?? "")),
      sending: String(item.sending ?? ""),
      receiving: String(item.receiving ?? ""),
      createdAt: item.timestamp ? new Date(item.timestamp).getTime() : 0,
      icon: String(item.icon ?? ""),
      creator: String(item.creator ?? ""),
    }));
  });

export const respondToConfirmations = (accountId, secrets, items, accept) =>
  withSession(accountId, secrets, async (session, offset) => {
    const list = Array.isArray(items) ? items.filter((item) => item?.id) : [];
    if (list.length === 0) return true;

    const tag = accept ? "accept" : "reject";
    const time = nextTime(session, offset);
    const key = SteamTotp.getConfirmationKey(secrets.identitySecret, time, tag);
    const ids = list.map((item) => String(item.id));
    const keys = list.map((item) => String(item.key));

    try {
      await call((done) =>
        session.community.respondToConfirmation(
          ids.length === 1 ? ids[0] : ids,
          keys.length === 1 ? keys[0] : keys,
          time,
          { tag, key },
          Boolean(accept),
          done,
        ),
      );
    } catch (error) {
      if (needsNewSession(error)) throw error;
      log("confirmations: respond failed", error?.message);
      throw new Error(`Steam could not complete the action: ${error?.message ?? error}`);
    }

    log(`confirmations: ${accept ? "accepted" : "declined"}`, ids.length);
    return true;
  });

export const forgetConfirmationSession = (accountId) => {
  sessions.delete(accountId);
};
