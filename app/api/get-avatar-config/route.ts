// /app/api/get-avatar-config/route.ts
import { readFile } from "fs/promises";
import path from 'path';

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public/avatar-config.json");
    const data = await readFile(filePath, 'utf8');

    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 500 });
  }
}