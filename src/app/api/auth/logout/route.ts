import { destroySession } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";

export async function POST() {
  try {
    await destroySession();
    return ok({ success: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
