import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-md border border-input bg-white px-3 text-base shadow-sm placeholder:text-muted-foreground",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-md border border-input bg-white px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("h-11 w-full rounded-md border border-input bg-white px-3 text-base shadow-sm", props.className)}
    />
  );
}
