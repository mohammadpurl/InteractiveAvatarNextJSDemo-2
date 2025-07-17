import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filePath = path.join(process.cwd(), "public/avatar-config.json");

    await writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 500 });
  }
}
