import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ANALYTICS_CONSENT_COOKIE } from "@/lib/product-analytics";
import { checkRateLimit, rateLimitedResponse, sameOrigin } from "@/lib/request-security";

export async function POST(req: NextRequest) {
  if (!req.headers.has("origin") || req.headers.get("sec-fetch-site") !== "same-origin" || !sameOrigin(req)) {
    return new Response(null, { status: 403 });
  }

  const consent = req.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value;
  if (consent !== "a" && consent !== "am") return new Response(null, { status: 204 });

  const user = (await auth())?.user;
  if (!user?.id) return new Response(null, { status: 401 });
  if (user.role !== "user" || user.status !== "active" || user.impersonatedBy) {
    return new Response(null, { status: 204 });
  }

  const limit = checkRateLimit(`windows-download-click:${user.id}`, 10, 60_000);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfter);

  // The existing application log supports aggregate counts without persisting account or installer data.
  console.info(JSON.stringify({ event: "click_download", at: new Date().toISOString() }));
  return new Response(null, { status: 204 });
}
