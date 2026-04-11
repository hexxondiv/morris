import { Heart } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link"; // Use Next.js Link for navigation

interface DonateButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  href?: string;
  text?: string;
  showIcon?: boolean;
}

export default function DonateButton({ 
  className = "",
  size = "sm",
  variant = "outline",
  href = "/pledge",
  text = "Donate Now",
  showIcon = true
}: DonateButtonProps) {
  const defaultClasses = `
    group relative overflow-hidden
    bg-gradient-to-r from-rose-50 to-pink-50 
    border-2 border-rose-200 
    text-rose-700 font-semibold
    hover:from-rose-100 hover:to-pink-100 
    hover:border-rose-300 hover:text-rose-800
    hover:shadow-lg hover:shadow-rose-200/50
    active:scale-95
    transition-all duration-300 ease-in-out
    hover:translate-y-[-2px]
  `;
  
  const combinedClasses = `${defaultClasses} ${className}`.trim();

  // Icon size based on button size
  const iconSize = {
    sm: "h-3 w-3 sm:h-4 sm:w-4",
    default: "h-4 w-4",
    lg: "h-5 w-5",
    icon: "h-4 w-4"
  };

  // Text size based on button size
  const textSize = {
    sm: "text-xs sm:text-sm",
    default: "text-sm",
    lg: "text-base",
    icon: "text-sm"
  };

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={combinedClasses}
    >
      <Link href={href} className="flex items-center gap-2">
        <span className={`${textSize[size]} font-semibold tracking-wide`}>
          {text}
        </span>
        {showIcon && (
          <Heart 
            className={`
              ${iconSize[size]} 
              transition-all duration-300 ease-in-out
              group-hover:text-red-500 group-hover:fill-red-500
              group-hover:scale-110 group-hover:animate-pulse
              drop-shadow-sm
            `} 
          />
        )}
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      </Link>
    </Button>
  );
}