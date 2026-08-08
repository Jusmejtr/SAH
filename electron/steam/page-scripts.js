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
    el.focus();
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

  // React ignores a bare .click() on some tiles, so the full pointer sequence is replayed.
  const fireClick = (el) => {
    el.scrollIntoView({ block: "center" });
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      el.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, view: window }),
      );
    }
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
      const regex = new RegExp(pattern, "i");
      const leaf = leaves().find((el) => regex.test((el.innerText || "").trim()));
      if (!leaf) return false;

      const target =
        leaf.closest('button, a, [role="button"], [tabindex], [onclick]') ??
        leaf.parentElement ??
        leaf;
      fireClick(target);
      return true;
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
