import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { isOrderStoreConfigured, listRecentOrders } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Return only the fields needed by the dashboard; never expose customer secrets
// or database credentials. The payment register remains the detailed evidence view.
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ configured: false, orders: [], requiresSignIn: true }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!isOrderStoreConfigured()) {
    return NextResponse.json({ configured: false, orders: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const orders = await listRecentOrders(100, user.id);
    return NextResponse.json(
      { configured: true, orders },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { configured: true, error: "Saved Sandbox orders could not be loaded." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
