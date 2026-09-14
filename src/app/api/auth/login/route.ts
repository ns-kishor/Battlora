import { db } from "@/lib/db";
import { createSession, publicUser, ApiError } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: string; password?: string }>(req);
    const email = str(body.email).toLowerCase();
    const password = str(body.password);

    if (!email || !password)
      throw new ApiError("Email and password are required.", 400);

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash))
      throw new ApiError("Invalid email or password.", 401);
    if (user.status === "BANNED")
      throw new ApiError("This account has been banned.", 403);

    await createSession(user.id);
    return ok({ user: publicUser(user) });
  } catch (e) {
    return handleRouteError(e);
  }
}
