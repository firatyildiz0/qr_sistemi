import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import {
  getPresence,
  isPresenceKind,
  presenceKey,
  touchPresence,
} from "@/lib/presence";

/**
 * Anlık kullanıcı sayacının iki ucu.
 *
 * POST: açık bir sekmenin kalp atışı. Herkese açık — ürün sayfasındaki
 * ziyaretçinin hesabı yok. Yazılan tek şey "bir anahtar şu an etkin"; anahtar da
 * IP'nin özeti (bkz. lib/presence.ts), yani buradan kimlik çıkmıyor.
 *
 * GET: panelin okuduğu sayı, yalnızca superuser'a.
 */

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null
  );
}

export async function POST(request: NextRequest) {
  let kind: unknown;
  try {
    kind = (await request.json())?.kind;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!isPresenceKind(kind)) {
    return new NextResponse(null, { status: 400 });
  }

  const user = await getCurrentUser();
  const key = presenceKey(user?.id ?? null, clientIp(request));

  // IP okunamayan ve oturumu da olmayan bir istek sayılamaz; sessizce geçiyoruz.
  if (key) await touchPresence(key, kind);

  // Yanıtın gövdesine gerek yok: sekme cevabı okumuyor.
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getPresence(), {
    headers: { "Cache-Control": "no-store" },
  });
}
