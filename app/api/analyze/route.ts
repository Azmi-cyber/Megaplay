import { NextRequest, NextResponse } from "next/server";
import { analyze, CREATOR } from "@/lib/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const headers = { "Cache-Control": "no-store" };

async function handle(url: string | null, referer?: string | null) {
  if (!url) return NextResponse.json({ creator: CREATOR, success: false, status: "failed", error: "Parameter 'url' wajib diisi." }, { status: 400, headers });
  try {
    const data = await analyze(url.trim(), referer?.trim() || undefined);
    return NextResponse.json(data, { status: data.status === "failed" && data.error?.includes("tidak valid") ? 400 : 200, headers });
  } catch (e: any) {
    return NextResponse.json({ creator: CREATOR, success: false, page_url: url, status: "failed", error: e?.message || "Kesalahan internal." }, { status: 500, headers });
  }
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return handle(p.get("url"), p.get("referer"));
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  return handle(b.url ?? null, b.referer ?? null);
}
