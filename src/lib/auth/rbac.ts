import { auth } from "./auth";
import { UserRole, USER_ROLES } from "@/constants/roles";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export class AuthorizationError extends Error {
  constructor(message = "Authentication required. Please log in.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Access denied. Insufficient permissions.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Ensures user is authenticated on the server side
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthorizationError("Authentication required. Please log in.");
  }

  return {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || "",
    role: ((session.user as { role?: string }).role as UserRole) || USER_ROLES.STUDENT,
  };
}

/**
 * Requires specific user role(s)
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${user.role}`
    );
  }

  return user;
}

/**
 * Requires Superadmin permissions
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireRole([USER_ROLES.ADMIN]);
}

/**
 * Requires Organizer permissions
 */
export async function requireOrganizer(): Promise<AuthenticatedUser> {
  return requireRole([USER_ROLES.ORGANIZER]);
}

/**
 * Requires Student permissions
 */
export async function requireStudent(): Promise<AuthenticatedUser> {
  return requireRole([USER_ROLES.STUDENT]);
}

/**
 * Checks whether user owns a resource or is a Superadmin
 */
export function checkResourceOwnership(
  user: AuthenticatedUser,
  resourceOwnerId: string
): boolean {
  if (user.role === USER_ROLES.ADMIN) {
    return true;
  }
  return user.id === resourceOwnerId;
}
