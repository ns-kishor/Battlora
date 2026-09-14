import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getSettings, handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

// GET /api/admin/settings — platform settings (PRD 64)
export async function GET() {
  try {
    await requirePermission("settings.view");
    const settings = await getSettings();
    return ok({
      settings: {
        ...settings,
        paymentMethods: JSON.parse(settings.paymentMethodsJson || "[]"),
        faq: JSON.parse(settings.faqJson || "[]"),
        paymentMethodsJson: undefined,
        faqJson: undefined,
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

// PUT /api/admin/settings — update platform settings
export async function PUT(req: Request) {
  try {
    const user = await requirePermission("settings.manage");
    const body = await readJson<{
      platformName?: string;
      accentColor?: string;
      contactEmail?: string;
      contactPhone?: string;
      paymentMethods?: { name?: string; number?: string; type?: string }[];
      paymentInstructions?: string;
      faq?: { q?: string; a?: string }[];
    }>(req);

    const data: Record<string, unknown> = {};
    if (body.platformName !== undefined) {
      const name = str(body.platformName);
      if (name.length < 2) throw new ApiError("Platform name is too short.", 400);
      data.platformName = name;
    }
    if (body.accentColor !== undefined) {
      const color = str(body.accentColor);
      if (!/^#[0-9a-fA-F]{6}$/.test(color))
        throw new ApiError("Accent color must be a hex value like #FF7A1C.", 400);
      data.accentColor = color;
    }
    if (body.contactEmail !== undefined) data.contactEmail = str(body.contactEmail);
    if (body.contactPhone !== undefined) data.contactPhone = str(body.contactPhone);
    if (body.paymentMethods !== undefined) {
      const methods = (body.paymentMethods ?? [])
        .map((m) => ({
          name: str(m.name),
          number: str(m.number),
          type: str(m.type) || "Mobile Wallet",
        }))
        .filter((m) => m.name && m.number);
      data.paymentMethodsJson = JSON.stringify(methods);
    }
    if (body.paymentInstructions !== undefined)
      data.paymentInstructions = str(body.paymentInstructions);
    if (body.faq !== undefined) {
      const faq = (body.faq ?? [])
        .map((f) => ({ q: str(f.q), a: str(f.a) }))
        .filter((f) => f.q && f.a);
      data.faqJson = JSON.stringify(faq);
    }

    const previous = await getSettings();
    const updated = await db.platformSettings.update({
      where: { id: "main" },
      data,
    });

    await logActivity({
      user,
      action: "Updated platform settings",
      entity: "Settings",
      entityId: "main",
      previousValue: { platformName: previous.platformName, accentColor: previous.accentColor },
      newValue: { platformName: updated.platformName, accentColor: updated.accentColor },
    });

    return ok({ settings: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
