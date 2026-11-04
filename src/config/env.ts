import { z } from "zod";

const envSchema = z.object({
  // Runtime environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Database
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/notari_oau"),

  // Authentication
  AUTH_SECRET: z.string().min(16).default("temporary_scaffold_auth_secret_minimum_32_characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  // Payments (Paystack)
  PAYSTACK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_CALLBACK_URL: z.string().url().optional(),

  // Media (Cloudinary) - Optional during scaffold
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email (Resend) - Optional during scaffold
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("NOTARI OAU <notifications@notari.oau.edu.ng>"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn("⚠️ Invalid environment variables detected during startup:", result.error.format());
    // In development or build mode, provide sensible defaults to prevent build stoppage
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV || "development",
    });
  }
  return result.data;
}

export const env = parseEnv();
