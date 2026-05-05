"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image, { ImageProps } from "next/image";

interface ThemedLogoProps extends Omit<ImageProps, "src" | "alt"> {
  alt?: string;
}

export function ThemedLogo({ alt = "SIGMA Bantul Logo", ...props }: ThemedLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fallback to logo-black during SSR or before mounting
  // Once mounted, use resolvedTheme to pick the correct logo
  const logoSrc = mounted && resolvedTheme === "dark" ? "/logo-white.png" : "/logo-black.png";

  return (
    <div 
      className={props.className} 
      style={{ 
        position: "relative", 
        width: props.width || 40, 
        height: props.height || 40,
        ...((props.style as object) || {})
      }}
    >
      <Image
        src={logoSrc}
        alt={alt}
        fill
        sizes={`${props.width || 40}px`}
        style={{ 
          objectFit: "contain",
        }}
        priority={props.priority}
      />
    </div>
  );
}
