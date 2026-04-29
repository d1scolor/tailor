import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "validation", details: error.flatten() }, { status: 400 });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "unknown" }, { status: 500 });
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
  }
}
