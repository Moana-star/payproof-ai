export async function getTestAccessToken(prefix) {
  const suppliedToken = process.env[prefix + "_TOKEN"];
  if (suppliedToken) return suppliedToken;

  const email = process.env[prefix + "_EMAIL"];
  const password = process.env[prefix + "_PASSWORD"];
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const publicKey = process.env.SUPABASE_PUBLIC_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!email || !password || !supabaseUrl || !publicKey) {
    throw new Error(
      "Set " + prefix + "_EMAIL and " + prefix + "_PASSWORD (or " + prefix + "_TOKEN), plus SUPABASE_URL and SUPABASE_PUBLIC_KEY, in your local shell. Never paste credentials into chat or commit them."
    );
  }

  const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(prefix + " could not sign in. Check the test account credentials and email confirmation status.");
  }
  return body.access_token;
}
