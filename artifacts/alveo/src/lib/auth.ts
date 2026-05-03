const TOKEN_KEY = "alveo_auth_token";
const EMAIL_KEY = "alveo_user_email";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function storeToken(token: string, email: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

/**
 * Returns the stored JWT for the given email, or throws if no token is stored
 * (i.e. the user must log in first). Never hits the network.
 */
export function getAuthToken(email: string): string {
  const storedEmail = getStoredEmail();
  const storedToken = getStoredToken();
  if (storedToken && storedEmail === email) return storedToken;
  throw new Error("No auth token — please log in");
}

export function makeAuthHeaders(email: string): Record<string, string> {
  const token = getAuthToken(email);
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

export function makeAuthHeadersSync(): Record<string, string> {
  const token = getStoredToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}
