"use client";

type LogoProps = {
  className?: string;
};

const Logo = ({ className }: LogoProps) => (
  <div
    className={[
      "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white",
      className
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 font-display text-lg text-white">
      G
    </span>
    <span className="font-display text-white">GoGreenOS</span>
  </div>
);

export default Logo;
