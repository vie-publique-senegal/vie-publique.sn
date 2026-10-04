/**
 * Déconnexion d'un observateur électoral
 * Route: POST /api/elections/auth/logout
 */
export default defineEventHandler(async (event) => {
  deleteCookie(event, "election_cms_token", { path: "/" });
  deleteCookie(event, "election_cms_refresh_token", { path: "/" });

  return { success: true };
});
