import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `stnk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(process.cwd(), "public", "uploads", "stnk", filename);

    await writeFile(filepath, buffer);

    const url = `/uploads/stnk/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: "Gagal upload" }, { status: 500 });
  }
}