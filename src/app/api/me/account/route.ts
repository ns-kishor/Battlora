import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireUser, publicUser, ApiError, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

// PATCH /api/me/account — update own account (name, login email, password).
// Self-scoped: the acting session user may only modify their own record.
export async function PATCH(req: Request) {
  try {
    const me = await requireUser();
    const body = await readJson<{
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }>(req);

    const dbUser = await db.user.findUnique({ where: { id: me.id } });
    if (!dbUser) throw new ApiError("Account not found.", 404);

    const name = body.name !== undefined ? str(body.name) : undefined;
    const email =
      body.email !== undefined ? str(body.email).toLowerCase() : undefined;
    const currentPassword = str(body.currentPassword);
    const newPassword =
      body.newPassword !== undefined ? str(body.newPassword) : undefined;

    const nameChanging = name !== undefined && name !== dbUser.name;
    const emailChanging = email !== undefined && email !== dbUser.email;
    const passwordChanging = !!newPassword;

    // Idempotent no-op: nothing sensitive requested and nothing changed
    if (!nameChanging && !emailChanging && !passwordChanging) {
      return ok({ user: publicUser(dbUser) });
    }

    // Sensitive changes (email / password) require the current password
    if (emailChanging || passwordChanging) {
      if (!currentPassword)
        throw new ApiError("Enter your current password to make this change.", 400);
      if (!verifyPassword(currentPassword, dbUser.passwordHash))
        throw new ApiError("Your current password is incorrect.", 403);
    }

    if (nameChanging) {
      if (name!.length < 2)
        throw new ApiError("Name must be at least 2 characters.", 400);
      if (name!.length > 60)
        throw new ApiError("Name is too long (max 60 characters).", 400);
    }

    if (emailChanging) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!))
        throw new ApiError("Please enter a valid email address.", 400);
      const existing = await db.user.findUnique({ where: { email: email! } });
      if (existing && existing.id !== me.id)
        throw new ApiError("An account with this email already exists.", 409);
    }

    if (passwordChanging) {
      if (newPassword!.length < 6)
        throw new ApiError("New password must be at least 6 characters.", 400);
      if (newPassword!.length > 100)
        throw new ApiError("New password is too long (max 100 characters).", 400);
    }

    // Apply updates
    const data: { name?: string; email?: string; passwordHash?: string } = {};
    if (nameChanging) data.name = name;
    if (emailChanging) data.email = email;
    if (passwordChanging) data.passwordHash = hashPassword(newPassword!);
    const updated = await db.user.update({ where: { id: me.id }, data });

    // Security: a password change revokes every OTHER session (this one stays)
    if (passwordChanging) {
      const jar = await cookies();
      const currentToken = jar.get(SESSION_COOKIE)?.value ?? null;
      await db.session.deleteMany({
        where: { userId: me.id, ...(currentToken ? { NOT: { token: currentToken } } : {}) },
      });
    }

    // Audit trail — never log password material
    await logActivity({
      user: me,
      action: passwordChanging ? "Changed own password" : "Updated own profile",
      entity: "User",
      entityId: me.id,
      ...(passwordChanging
        ? {}
        : {
            previousValue: { name: dbUser.name, email: dbUser.email },
            newValue: { name: updated.name, email: updated.email },
          }),
    });

    // Security notifications to self
    if (emailChanging) {
      await notify({
        userId: me.id,
        title: "Login email changed",
        message: `Your login email was changed to ${updated.email}. If this wasn't you, contact support@battlora.gg immediately.`,
        type: "SECURITY",
      });
    }
    if (passwordChanging) {
      await notify({
        userId: me.id,
        title: "Password changed",
        message:
          "Your password was updated and all other devices have been signed out.",
        type: "SECURITY",
      });
    }

    return ok({ user: publicUser(updated) });
  } catch (e) {
    return handleRouteError(e);
  }
}
