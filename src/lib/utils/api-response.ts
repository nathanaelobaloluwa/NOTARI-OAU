import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]> | string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export function apiSuccess<T>(data: T, message?: string, status = 200, meta?: ApiResponse["meta"]) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      message,
      data,
      meta,
    },
    { status }
  );
}

export function apiError(message: string, status = 400, errors?: Record<string, string[]> | string) {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      message,
      errors,
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error("[API_ERROR]", error);

  if (error instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = issue.path.join(".") || "form";
      if (!formattedErrors[field]) formattedErrors[field] = [];
      formattedErrors[field].push(issue.message);
    }
    return apiError("Validation failed", 422, formattedErrors);
  }

  // Handle MongoDB duplicate key error code 11000 globally
  const mongoError = error as { code?: number };
  if (mongoError?.code === 11000) {
    return apiError("A record with this unique value already exists.", 409);
  }

  if (error instanceof Error) {
    if (error.name === "AuthorizationError") {
      return apiError(error.message, 401);
    }
    if (error.name === "ForbiddenError") {
      return apiError(error.message, 403);
    }
    // Prevent exposing raw database connection strings, stack traces, or socket errors to client
    if (error.name === "MongoServerError" || error.name === "MongooseError") {
      return apiError("A database service error occurred. Please try again later.", 500);
    }
    return apiError(error.message, 500);
  }

  return apiError("An unexpected server error occurred", 500);
}
