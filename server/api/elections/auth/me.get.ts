import { createDirectus, readMe, rest, staticToken } from "@directus/sdk";

/**
 * Récupère l'utilisateur actuellement connecté
 * Route: GET /api/elections/auth/me
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const token = getCookie(event, "election_cms_token");

  if (!token) {
    throw createError({
      statusCode: 401,
      message: "Non authentifié",
    });
  }

  try {
    const client = createDirectus(config.cmsApiUrl)
      .with(rest())
      .with(staticToken(token));

    const user = await client.request(readMe());

    return { user };
  } catch {
    // Token invalide ou expiré
    deleteCookie(event, "election_cms_token", { path: "/" });
    deleteCookie(event, "election_cms_refresh_token", { path: "/" });

    throw createError({
      statusCode: 401,
      message: "Session expirée",
    });
  }
});
