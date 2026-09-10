type LogoProps = {
  size?: number;
  title?: string;
};

/** Shield with a keyhole cut-out, drawn in currentColor. */
export default function Logo({ size = 24, title = "SAH" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      style={{ display: "block" }}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M24 6.2 39.4 12.1 V25.2 c0 9.3-6.2 16.3-15.4 19.6 C14.8 41.5 8.6 34.5 8.6 25.2 V12.1 Z
           M24 18.4 a3.6 3.6 0 1 0 0 7.2 a3.6 3.6 0 1 0 0-7.2 Z
           M22.1 25.6 h3.8 l1.3 6.4 h-6.4 Z"
      />
    </svg>
  );
}
