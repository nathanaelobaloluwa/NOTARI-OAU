import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { registerSchema } from "@/validators/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api-response";
import { USER_ROLES } from "@/constants/roles";
import { normalizeFaculty } from "@/constants/oau";
import { OtpService } from "@/lib/auth/otp-service";

/**
 * POST /api/auth/register
 * Public registration endpoint strictly for student accounts.
 * Validates with Zod, hashes passwords with bcrypt, normalizes emails,
 * enforces uniqueness on email and matriculation number, and never exposes password hashes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    const normalizedEmail = validated.email.toLowerCase().trim();
    const normalizedMatric = validated.matricNumber
      ? validated.matricNumber.toUpperCase().trim()
      : undefined;

    await connectToDatabase();

    // 1. Prevent duplicate email registrations
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return apiError(
        "An account with this email address already exists. Please log in instead.",
        409
      );
    }

    // 2. Prevent duplicate matriculation numbers if provided
    if (normalizedMatric) {
      const existingMatric = await User.findOne({ matricNumber: normalizedMatric });
      if (existingMatric) {
        return apiError(
          "A student with this matriculation number is already registered.",
          409
        );
      }
    }

    // 3. Hash password securely using bcryptjs (12 salt rounds)
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // 4. Force default STUDENT role - public registration cannot assign organizer or superadmin
    const newUser = await User.create({
      name: validated.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: USER_ROLES.STUDENT,
      matricNumber: normalizedMatric,
      faculty: normalizeFaculty(validated.faculty),
      department: validated.department?.trim() || undefined,
      isVerified: false,
    });

    // 5. Generate and dispatch secure 6-digit registration OTP
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const otpResult = await OtpService.createAndSendOtp({
      userId: newUser._id,
      email: normalizedEmail,
      name: newUser.name,
      purpose: "registration",
      ipAddress,
      userAgent,
    });

    // 6. Return response instructing user to verify their email
    return apiSuccess(
      {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        matricNumber: newUser.matricNumber,
        faculty: newUser.faculty,
        department: newUser.department,
        isVerified: false,
        requireVerification: true,
        devOtpCode: otpResult.devOtpCode,
        deliveryError: otpResult.deliveryError,
        createdAt: newUser.createdAt,
      },
      otpResult.deliveryError
        ? `Account registered! Notice: ${otpResult.deliveryError}`
        : "Account registered! A 6-digit verification code has been sent to your email address.",
      201
    );
  } catch (error: unknown) {
    // Handle MongoDB duplicate key error (code 11000) for race conditions
    const mongoError = error as { code?: number; keyPattern?: Record<string, number> };
    if (mongoError?.code === 11000) {
      if (mongoError.keyPattern?.matricNumber) {
        return apiError("A student with this matriculation number is already registered.", 409);
      }
      return apiError("An account with this email address already exists. Please log in instead.", 409);
    }
    return handleApiError(error);
  }
}

