interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Logo({ size = 32, color = "currentColor", className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
    >
      <rect
        x="4" y="4"
        width="56" height="56"
        rx="12"
        stroke={color}
        strokeWidth="3"
        fill="none"
      />
      <path d="M16 46V18L32 34L48 18V46" fill={color} />
    </svg>
  );
}
