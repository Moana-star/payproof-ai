import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ status: "REVIEW_REQUIRED", verified: false }); }
