import { NextResponse } from "next/server";
import { getCachedTrendItems } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: getCachedTrendItems() });
}