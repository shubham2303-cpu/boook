import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALBUM_DIR = path.join(process.cwd(), "public", "album");

function ensureDir() {
  if (!fs.existsSync(ALBUM_DIR)) fs.mkdirSync(ALBUM_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "images only" }, { status: 400 });

    ensureDir();
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}.${ext}`;
    const filepath = path.join(ALBUM_DIR, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buf);

    return NextResponse.json({ url: `/album/${filename}`, pathname: filename });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
