import * as React from "react";
import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", props.className)} />;
}
