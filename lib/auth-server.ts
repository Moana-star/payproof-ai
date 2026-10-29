import { NextRequest } from "next/server";

export type AuthenticatedUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!response.ok) return null;
    const user = await response.json() as AuthenticatedUser;
    return typeof user.id === "string" ? user : null;
  } catch {
    return null;
  }
}
