import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-base font-medium transition-colors disabled:opacity-50",
        size === "sm" && "h-10 px-3 text-sm",
        size === "md" && "h-11 px-4",
        size === "icon" && "h-11 w-11",
        variant === "primary" && "border-primary bg-primary text-primary-foreground",
        variant === "secondary" && "border-border bg-card text-foreground",
        variant === "ghost" && "border-transparent bg-transparent text-foreground hover:bg-muted",
        variant === "danger" && "border-destructive bg-destructive text-destructive-foreground",
        className
      )}
      {...props}
    />
  );
}
