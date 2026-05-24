import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALBUM_DIR = path.join(process.cwd(), "public", "album");

function ensureDir() {
  if (!fs.existsSync(ALBUM_DIR)) fs.mkdirSync(ALBUM_DIR, { recursive: true });
}

export async function GET() {
  ensureDir();
  const files = fs
    .readdirSync(ALBUM_DIR)
    .filter((f) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f))
    .sort();
  const images = files.map((f) => ({ url: `/album/${f}`, pathname: f }));
  return NextResponse.json({ images });
}

export async function DELETE(req: NextRequest) {
  try {
    const { pathname } = await req.json();
    if (!pathname) return NextResponse.json({ error: "pathname required" }, { status: 400 });
    const safe = path.basename(pathname);
    const filepath = path.join(ALBUM_DIR, safe);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete error:", err);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
}
