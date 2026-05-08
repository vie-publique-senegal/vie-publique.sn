export interface AuthUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

/**
 * Composable pour gérer l'authentification des observateurs électoraux
 */
export const useElectionAuth = () => {
  const currentUser = useState<AuthUser | null>("election_auth_user", () => null);
  const authChecked = useState<boolean>("election_auth_checked", () => false);

  const checkAuth = async () => {
    if (authChecked.value) return;
    try {
      const res = await $fetch<{ user: AuthUser }>("/api/elections/auth/me");
      currentUser.value = res.user;
    } catch {
      currentUser.value = null;
    } finally {
      authChecked.value = true;
    }
  };

  const login = async (email: string, password: string) => {
    const res = await $fetch<{ user: AuthUser }>("/api/elections/auth/login", {
      method: "POST",
      body: { email, password },
    });
    currentUser.value = res.user;
    authChecked.value = true;
    return res.user;
  };

  const logout = async () => {
    await $fetch("/api/elections/auth/logout", { method: "POST" }).catch(() => {});
    currentUser.value = null;
    authChecked.value = false;
  };

  const isAuthenticated = computed(() => !!currentUser.value);

  const displayName = computed(() => {
    if (!currentUser.value) return "";
    const { first_name, last_name, email } = currentUser.value;
    if (first_name || last_name) return [first_name, last_name].filter(Boolean).join(" ");
    return email;
  });

  return {
    user: currentUser,
    isAuthenticated,
    displayName,
    checkAuth,
    login,
    logout,
  };
};
