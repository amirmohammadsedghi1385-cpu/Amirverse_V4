import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureDb, newId } from "@/lib/db";

export const runtime = "nodejs";

type GalleryRow = {
  id: string;
  owner_id: string;
  kind: "image" | "text";
  title: string;
  value: string;
  created_at: string;
};

function toItem(row: GalleryRow) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    value: row.value,
    createdAt: row.created_at,
    ownerId: row.owner_id
  };
}

export async function GET() {
  await ensureDb();

  const result = db.execute({
    sql: `SELECT id, owner_id, kind, title, value, created_at
          FROM public_gallery
          ORDER BY created_at DESC
          LIMIT 8`
  });

  const rows = result.rows as unknown as GalleryRow[];

  return NextResponse.json(
    { items: rows.reverse().map(toItem) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { error: "وارد حساب شوید." },
      { status: 401 }
    );
  }

  await ensureDb();

  const body = await request.json().catch(() => null);

  if (!body || (body.kind !== "image" && body.kind !== "text")) {
    return NextResponse.json(
      { error: "نوع آیتم نامعتبر است." },
      { status: 400 }
    );
  }

  const title = String(body.title ?? "").trim().slice(0, 120);
  const value = String(body.value ?? "");

  if (!title || !value) {
    return NextResponse.json(
      { error: "عنوان و محتوای آیتم الزامی است." },
      { status: 400 }
    );
  }

  if (body.kind === "text" && value.length > 10000) {
    return NextResponse.json(
      { error: "متن بیش از حد طولانی است." },
      { status: 400 }
    );
  }

  if (body.kind === "image" && !value.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "تصویر نامعتبر است." },
      { status: 400 }
    );
  }

  const id = newId();

  db.execute({
    sql: `INSERT INTO public_gallery
          (id, owner_id, kind, title, value, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      user.id,
      body.kind,
      title,
      value,
      new Date().toISOString()
    ]
  });

  db.execute({
    sql: `DELETE FROM public_gallery
          WHERE id NOT IN (
            SELECT id FROM public_gallery
            ORDER BY created_at DESC
            LIMIT 8
          )`
  });

  return NextResponse.json(
    {
      item: {
        id,
        kind: body.kind,
        title,
        value,
        createdAt: new Date().toISOString(),
        ownerId: user.id
      }
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { error: "وارد حساب شوید." },
      { status: 401 }
    );
  }

  await ensureDb();

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");

  if (!id) {
    return NextResponse.json(
      { error: "شناسه آیتم ارسال نشده است." },
      { status: 400 }
    );
  }

  const result = db.execute({
    sql: `DELETE FROM public_gallery
          WHERE id = ? AND owner_id = ?`,
    args: [id, user.id]
  });

  if (result.changes !== 1) {
    return NextResponse.json(
      { error: "آیتم پیدا نشد یا اجازه حذف آن را ندارید." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
