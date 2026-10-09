import React from "react";

interface VaastavLogoProps {
  className?: string;
  size?: number;
  alt?: string;
  whiteOnly?: boolean;
}

export default function VaastavLogo({
  className = "h-10 w-10",
  size = 40,
  alt = "Vaastav logo",
  whiteOnly = false,
}: VaastavLogoProps) {
  if (whiteOnly) {
    // White monochrome variant for solid gradient tiles if needed
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        <path
          d="M14 14 32 50"
          stroke="#FFFFFF"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M50 14 32 50"
          stroke="#FFFFFF"
          strokeWidth="11"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle
          cx="51"
          cy="11"
          r="6"
          fill="#2FD08F"
          stroke="#FFFFFF"
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  return (
    <img
      src="/Vaastav-logo.svg"
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
