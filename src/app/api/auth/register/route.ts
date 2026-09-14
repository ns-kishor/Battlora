import { db } from "@/lib/db";
import { createSession, publicUser, ApiError } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

export async function POST(req: Request) {
  try {
    const body = await readJson<{
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    }>(req);

    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    const phone = str(body.phone);
    const password = str(body.password);

    if (name.length < 2) throw new ApiError("Please enter your full name.", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new ApiError("Please enter a valid email address.", 400);
    if (password.length < 6)
      throw new ApiError("Password must be at least 6 characters.", 400);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) throw new ApiError("An account with this email already exists.", 409);

    const user = await db.user.create({
      data: {
        email,
        name,
        phone: phone || null,
        passwordHash: hashPassword(password),
        role: "PLAYER",
      },
    });

    await createSession(user.id);
    return ok({ user: publicUser(user) }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}
