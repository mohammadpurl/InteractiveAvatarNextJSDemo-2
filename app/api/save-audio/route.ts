import { writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // مسیر ذخیره فایل (مثلاً در public/recordings)
  const filePath = path.join(
    process.cwd(),
    "public",
    "recordings",
    `audio_${Date.now()}.webm`,
  );

  await writeFile(filePath, uint8Array);

  return NextResponse.json({ message: "File saved", path: filePath });
}
