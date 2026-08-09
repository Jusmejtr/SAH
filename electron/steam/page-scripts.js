/** Injects helpers used to inspect and drive the Steam sign-in page. */
export const INSTALL = `
window.__sah = (() => {
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  };

  const label = (el) =>
    (el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("name") ||
      el.innerText ||
      "").trim().slice(0, 80);

  const setValue = (el, value) => {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    el.focus({ preventScroll: true });
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const inputs = () =>
    Array.from(document.querySelectorAll("input")).filter(isVisible);

  const clickables = () =>
    Array.from(
      document.querySelectorAll(
        'button, a, [role="button"], [type="submit"], [tabindex], [onclick]',
      ),
    ).filter(isVisible);

  const leaves = () =>
    Array.from(document.querySelectorAll("body *")).filter(
      (el) => el.children.length === 0 && isVisible(el),
    );

  // CSS-module class names carry a hashed suffix (newlogindialog_SignInButton_1ku5B);
  // stripping it leaves a stable, language independent hint about the current screen.
  const classTokens = () => {
    const tokens = new Set();
    document.querySelectorAll("[class]").forEach((el) => {
      const raw =
        typeof el.className === "string" ? el.className : el.className.baseVal || "";
      raw.split(/\\s+/).forEach((token) => {
        if (token) tokens.add(token.replace(/_[A-Za-z0-9-]{4,}$/, ""));
      });
    });
    return Array.from(tokens);
  };

  const isAvatarUrl = (value) => /avatar|steamcommunity|steamstatic/i.test(value || "");

  // Some picker skins paint the avatar as a CSS background instead of an <img>.
  const avatarImages = () => {
    const images = Array.from(document.querySelectorAll("img")).filter(
      (img) => isVisible(img) && isAvatarUrl(img.src),
    );
    if (images.length > 0) return images;
    return Array.from(document.querySelectorAll("div, span")).filter(
      (el) => isVisible(el) && isAvatarUrl(getComputedStyle(el).backgroundImage),
    );
  };

  let tileElements = [];

  /**
   * Account picker entries, found by their avatar image instead of the screen's wording.
   * Sibling entries without an avatar are the "add an account" style tiles.
   */
  const accountTiles = () => {
    const avatars = avatarImages();
    tileElements = [];
    if (avatars.length === 0) return [];

    const owners = new Set();
    avatars.forEach((img) => {
      let node = img.parentElement;
      for (let depth = 0; node && depth < 4; depth += 1) {
        if ((node.innerText || "").trim()) break;
        node = node.parentElement;
      }
      if (node) owners.add(node);
    });

    const siblings = new Set();
    owners.forEach((owner) => {
      const parent = owner.parentElement;
      if (!parent) return;
      Array.from(parent.children).forEach((child) => {
        if (isVisible(child)) siblings.add(child);
      });
    });

    tileElements = Array.from(siblings.size ? siblings : owners);
    return tileElements.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        text: (el.innerText || "").trim().slice(0, 80),
        hasAvatar: avatars.some((img) => el.contains(img)),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    });
  };

  let pointerElements = [];

  // A computed cursor of "pointer" marks Steam's link-style controls regardless of wording.
  const pointerTargets = () => {
    const seen = new Set();
    pointerElements = Array.from(document.querySelectorAll("body *")).filter((el) => {
      if (!isVisible(el) || el.disabled) return false;
      if (getComputedStyle(el).cursor !== "pointer") return false;
      const text = (el.innerText || "").trim();
      if (!text || text.length > 60 || seen.has(text)) return false;
      if (
        Array.from(el.children).some(
          (child) => (child.innerText || "").trim() === text,
        )
      ) {
        return false;
      }
      seen.add(text);
      return true;
    });

    return pointerElements.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        text: (el.innerText || "").trim().slice(0, 60),
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    });
  };

  const resolveText = (pattern) => {
    const regex = new RegExp(pattern, "i");
    const leaf = leaves().find((el) => regex.test((el.innerText || "").trim()));
    if (!leaf) return null;
    return (
      leaf.closest('button, a, [role="button"], [tabindex], [onclick]') ??
      leaf.parentElement ??
      leaf
    );
  };

  const ensureInView = (el) => {
    const rect = el.getBoundingClientRect();
    const inView =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    if (!inView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
    return el.getBoundingClientRect();
  };

  // React ignores a bare .click() on some tiles, so the full pointer sequence is replayed.
  const fireClick = (el) => {
    const rect = ensureInView(el);
    const base = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      button: 0,
      detail: 1,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    };
    const Pointer = window.PointerEvent ?? MouseEvent;
    el.dispatchEvent(new Pointer("pointerover", { ...base, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("mouseover", { ...base, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("mousemove", { ...base, buttons: 0 }));
    el.dispatchEvent(new Pointer("pointerdown", { ...base, buttons: 1 }));
    el.dispatchEvent(new MouseEvent("mousedown", { ...base, buttons: 1 }));
    if (typeof el.focus === "function") el.focus({ preventScroll: true });
    el.dispatchEvent(new Pointer("pointerup", { ...base, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("mouseup", { ...base, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("click", { ...base, buttons: 0 }));
  };

  return {
    describe() {
      return {
        url: location.href,
        title: document.title,
        text: (document.body?.innerText || "").trim().slice(0, 1200),
        inputs: inputs().map((el, index) => ({
          index,
          type: el.type,
          label: label(el),
          maxLength: el.maxLength,
          filled: el.value.length > 0,
        })),
        buttons: clickables().map((el, index) => ({
          index,
          tag: el.tagName.toLowerCase(),
          text: label(el),
          disabled: Boolean(el.disabled),
        })),
        texts: Array.from(
          new Set(
            leaves()
              .map((el) => (el.innerText || "").trim())
              .filter((text) => text && text.length <= 60),
          ),
        ),
        tiles: accountTiles(),
        links: pointerTargets(),
        classTokens: classTokens().filter((token) =>
          /login|signin|sign_in|account|guard|qr|code|confirm/i.test(token),
        ),
      };
    },

    /** Clicks an account picker tile by the index reported in describe().tiles. */
    clickTile(index) {
      const target = tileElements[index];
      if (!target) return false;
      fireClick(target);
      return true;
    },

    /** Clicks a control by the index reported in describe().links. */
    clickLink(index) {
      const target = pointerElements[index];
      if (!target) return false;
      fireClick(target);
      return true;
    },

    /** Submits the current form without relying on the button's wording. */
    submit() {
      const selectors = [
        'button[type="submit"]',
        '[class*="SubmitButton" i]',
        '[class*="SignInButton" i]',
        "form button",
      ];
      for (const selector of selectors) {
        const target = Array.from(document.querySelectorAll(selector)).find(
          (el) => isVisible(el) && !el.disabled,
        );
        if (target) {
          fireClick(target);
          return true;
        }
      }

      const field = inputs().find((el) => el.type === "password") ?? inputs().at(-1);
      if (!field) return false;
      field.focus({ preventScroll: true });
      ["keydown", "keypress", "keyup"].forEach((type) =>
        field.dispatchEvent(
          new KeyboardEvent(type, {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }),
        ),
      );
      field.closest("form")?.requestSubmit?.();
      return true;
    },

    fillCredentials(username, password) {
      const fields = inputs();
      const passwordField = fields.find((el) => el.type === "password");
      const textField = fields.find((el) => el.type === "text");
      if (!passwordField) return false;
      if (textField) setValue(textField, username);
      setValue(passwordField, password);
      return true;
    },

    fillCode(code) {
      const fields = inputs().filter((el) => el.type !== "password");
      const boxes = fields.filter((el) => el.maxLength === 1);

      if (boxes.length >= code.length) {
        code.split("").forEach((character, index) => setValue(boxes[index], character));
        return true;
      }

      const single = fields.find((el) => (el.maxLength ?? 0) >= code.length || el.maxLength <= 0);
      if (!single) return false;
      setValue(single, code);
      return true;
    },

    click(pattern) {
      const regex = new RegExp(pattern, "i");
      const target = clickables().find(
        (el) => !el.disabled && regex.test(label(el)),
      );
      if (!target) return false;
      fireClick(target);
      return true;
    },

    /** Clicks anything showing the given text, including plain tiles without a role. */
    clickText(pattern) {
      const target = resolveText(pattern);
      if (!target) return false;
      fireClick(target);
      return true;
    },

    /**
     * Returns viewport coordinates for the element showing the given text so the caller
     * can dispatch a real (trusted) mouse click through CDP.
     */
    locateText(pattern) {
      const regex = new RegExp(pattern, "i");
      const leaf = leaves().find((el) => regex.test((el.innerText || "").trim()));
      if (!leaf) return null;
      const rect = ensureInView(leaf);
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    },
  };
})();
true;
`;

/**
 * True when the page looks like Steam's sign-in flow. Structural checks come first so the
 * probe also works when the client runs in a language other than English.
 */
/**
 * True when the page looks like Steam's sign-in flow. The checks are structural only, so
 * the probe works in any client language.
 */
export const PROBE = `
(() => {
  const codeBoxes = document.querySelectorAll('input[maxlength="1"]');
  const dialog = document.querySelector(
    '[class*="login" i], [class*="signin" i], [class*="sign_in" i], [class*="authentic" i]',
  );
  const avatars = document.querySelectorAll('img[src*="avatar" i]');
  return Boolean(document.querySelector('input[type="password"]')) ||
    codeBoxes.length >= 4 ||
    Boolean(dialog) ||
    avatars.length > 0;
})()
`;
