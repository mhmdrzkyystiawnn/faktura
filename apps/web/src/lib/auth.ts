const ACCESS_TOKEN_KEY = "accessToken";

export interface AuthResponse {
  accessToken: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Login failed");
  }

  const data: AuthResponse = await response.json();
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  return data;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Registration failed");
  }

  const data: AuthResponse = await response.json();
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  return data;
}

export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
