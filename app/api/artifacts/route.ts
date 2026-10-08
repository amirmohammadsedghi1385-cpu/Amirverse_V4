import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArtifacts } from "@/lib/artifacts";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "وارد حساب شوید." }, { status: 401 });
  return NextResponse.json({ artifacts: await getArtifacts(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
