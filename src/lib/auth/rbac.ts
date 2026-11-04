import { auth } from "./auth";
import { UserRole, USER_ROLES, ORGANIZER_STATUS } from "@/constants/roles";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { OrganizerProfile, IOrganizerProfileDocument } from "@/models/OrganizerProfile";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isOrganizer?: boolean;
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

  const role = ((session.user as { role?: string }).role as UserRole) || USER_ROLES.STUDENT;
  const isOrganizer = Boolean(
    (session.user as { isOrganizer?: boolean }).isOrganizer || role === USER_ROLES.ORGANIZER
  );

  return {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || "",
    role,
    isOrganizer,
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
  const user = await requireAuth();

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.ORGANIZER || user.isOrganizer) {
    return user;
  }

  throw new ForbiddenError("Organizer accreditation required to perform this action.");
}

/**
 * Requires verified organizer access confirmed against trusted database records.
 * Returns the authenticated user along with their active OrganizerProfile.
 */
export async function requireApprovedOrganizer(
  verifyInDb = true
): Promise<AuthenticatedUser & { organizerProfile?: IOrganizerProfileDocument }> {
  const user = await requireAuth();

  if (user.role === USER_ROLES.ADMIN) {
    // Admin has universal oversight
    if (verifyInDb) {
      await connectToDatabase();
      const profile = await OrganizerProfile.findOne({ userId: user.id }).lean();
      return { ...user, organizerProfile: (profile as IOrganizerProfileDocument) || undefined };
    }
    return user;
  }

  const hasCapability = Boolean(user.isOrganizer || user.role === USER_ROLES.ORGANIZER);
  if (!hasCapability) {
    throw new ForbiddenError("Organizer accreditation required to perform this action.");
  }

  if (verifyInDb) {
    await connectToDatabase();

    // Verify user's actual database record
    const [dbUser, profile] = await Promise.all([
      User.findById(user.id).select("role isOrganizer").lean(),
      OrganizerProfile.findOne({
        userId: user.id,
        status: ORGANIZER_STATUS.APPROVED,
      }),
    ]);

    const isDbOrganizer = Boolean(dbUser?.isOrganizer || dbUser?.role === USER_ROLES.ORGANIZER);

    if (!isDbOrganizer || !profile) {
      throw new ForbiddenError(
        "Access denied: Your organizer accreditation is not currently approved in the system."
      );
    }

    return { ...user, organizerProfile: profile };
  }

  return user;
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
