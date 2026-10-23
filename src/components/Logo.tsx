import { useId } from "preact/hooks";

type LogoProps = {
  size?: number;
  title?: string;
};

const SHIELD =
  "M128 38 L203 66.7 V130.5 C203 175.8 172.8 209.9 128 226 C83.2 209.9 53 175.8 53 130.5 V66.7 Z";

/**
 * Steam Guard shield with two accounts cut out of it, drawn in currentColor.
 * Same artwork as public/app-icon.svg, without the background tile.
 */
export default function Logo({ size = 24, title = "SAH" }: LogoProps) {
  const maskId = `sah-logo-${useId()}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="30 34 196 196"
      role="img"
      aria-label={title}
      style={{ display: "block" }}
    >
      <mask id={maskId}>
        <path d={SHIELD} fill="#fff" />
        <g fill="#000">
          <circle cx="150" cy="104" r="17" opacity="0.55" />
          <path opacity="0.55" d="M118 168 c3-22 16-34 32-34 s29 12 32 34 Z" />
          <circle cx="116" cy="112" r="20" />
          <path d="M78 178 c4-26 19-40 38-40 s34 14 38 40 c-10 9-23 14-38 14 s-28-5-38-14 Z" />
        </g>
      </mask>
      <rect
        x="30"
        y="34"
        width="196"
        height="196"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
