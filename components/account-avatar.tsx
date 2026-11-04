"use client";

import type { CSSProperties } from "react";

export function AccountAvatar({ name, imageUrl, size = 36 }: { name?: string; imageUrl?: string; size?: number }) {
  const initials = (name || "Account").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
  const style: CSSProperties = { width: size, height: size, minWidth: size, borderRadius: "50%", objectFit: "cover", display: "inline-grid", placeItems: "center", overflow: "hidden", background: "#E5F5F6", color: "#193A70", fontSize: Math.max(11, size * 0.34), fontWeight: 800, lineHeight: 1 };
  return imageUrl ? <img src={imageUrl} alt={name ? `${name} profile photo` : "Profile photo"} referrerPolicy="no-referrer" style={style} /> : <span aria-hidden="true" style={style}>{initials}</span>;
}
