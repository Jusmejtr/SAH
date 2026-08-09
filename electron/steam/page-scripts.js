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
      };
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

/** True when the page looks like Steam's sign-in flow. */
export const PROBE = `
(() => {
  const text = document.body ? document.body.innerText : "";
  return Boolean(document.querySelector('input[type="password"]')) ||
    /sign in to steam|steam guard|mobile authenticator|enter the code|who's playing|whos playing/i.test(text);
})()
`;
