"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-lime text-white hover:bg-lime-deep disabled:bg-lime/50 shadow-sm hover:shadow",
  secondary:
    "bg-white text-ink border border-ink/15 hover:border-lime hover:text-lime",
  ghost: "bg-transparent text-ink/70 hover:text-ink hover:bg-ink/5",
  danger: "bg-signal text-white hover:bg-signal/90 disabled:bg-signal/50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className = "", children, ...rest }, ref) => {
    const sizing = size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2";
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-1.5 rounded-md font-semibold
          transition-all duration-150 active:scale-[0.98] disabled:opacity-50
          disabled:cursor-not-allowed disabled:active:scale-100
          ${sizing} ${VARIANTS[variant]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export default Button;
