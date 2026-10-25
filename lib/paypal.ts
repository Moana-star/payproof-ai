const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal Sandbox credentials are not configured on the server.");
  }
  return { clientId, clientSecret };
}

export async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PayPal authentication failed (HTTP ${response.status}). Check Sandbox app credentials.`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal did not return an access token.");
  return data.access_token;
}

export async function paypalRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    // Do not pass provider response bodies to the browser; they may contain details
    // that are not appropriate to expose in a user-facing error.
    throw new Error(`PayPal request failed (HTTP ${response.status}). Please retry or review the Sandbox app configuration.`);
  }
  return (await response.json()) as T;
}

export { PAYPAL_BASE_URL };
