import { authentication, createDirectus, readMe, rest } from "@directus/sdk";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface RateEntry {
  count: number;
  resetAt: number;
}

/**
 * Authentification des observateurs électoraux
 * Route: POST /api/elections/auth/login
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const { email, password } = body || {};

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: "Email et mot de passe requis",
    });
  }

  // Rate limiting par IP
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  const storage = useStorage("cache");
  const rateKey = `election_login_rate:${ip}`;

  const entry = await storage.getItem<RateEntry>(rateKey);
  const now = Date.now();

  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / 60000);
    throw createError({
      statusCode: 429,
      message: `Trop de tentatives échouées. Réessayez dans ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`,
    });
  }

  // Tentative de connexion via SDK Directus
  const cmsUrl = config.cmsApiUrl;

  try {
    const client = createDirectus(cmsUrl)
      .with(authentication("json", { autoRefresh: false }))
      .with(rest());

    // Authentification
    await client.login(email, password);

    // Récupérer le token généré
    const authData = await client.getToken();
    if (!authData) {
      throw new Error("Échec de récupération du token");
    }

    // Succès : reset le rate limit
    await storage.removeItem(rateKey);

    // Stocker le token dans un cookie httpOnly
    setCookie(event, "election_cms_token", authData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 heures
      path: "/",
    });

    // Récupérer les infos de l'utilisateur avec son rôle
    const user = await client.request(
      readMe({
        fields: ["id", "email", "first_name", "last_name", "role.name"],
      } as any)
    );

    // Vérifier que l'utilisateur a le rôle "Observateur electoral" (insensible à la casse)
    const roleName = (user as any)?.role?.name;
    if (!roleName || roleName.toLowerCase().trim() !== "observateur electoral") {
      // Supprimer les cookies si déjà définis
      deleteCookie(event, "election_cms_token");
      deleteCookie(event, "election_cms_refresh_token");

      throw createError({
        statusCode: 403,
        message: "Accès refusé. Seuls les observateurs électoraux peuvent se connecter.",
      });
    }

    return { user };
  } catch (error: any) {
    // Si l'erreur est déjà un H3Error avec un statusCode, on la propage
    if (error.statusCode) {
      throw error;
    }

    // Échec : incrémenter le compteur
    const currentCount = entry && entry.resetAt > now ? entry.count : 0;
    const newCount = currentCount + 1;
    const resetAt =
      entry && entry.resetAt > now ? entry.resetAt : now + LOCKOUT_MS;

    await storage.setItem(rateKey, {
      count: newCount,
      resetAt,
    } satisfies RateEntry);

    const remaining = MAX_ATTEMPTS - newCount;
    if (remaining <= 0) {
      throw createError({
        statusCode: 429,
        message: "Trop de tentatives échouées. Compte bloqué 15 minutes.",
      });
    }

    throw createError({
      statusCode: 401,
      message:
        remaining === 1
          ? "Email ou mot de passe incorrect. Dernière tentative avant blocage."
          : `Email ou mot de passe incorrect. ${remaining} tentatives restantes.`,
    });
  }
});
