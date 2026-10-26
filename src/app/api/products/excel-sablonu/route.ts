import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildTemplate } from "@/lib/urun-excel";

/** Toplu ürün eklemenin boş Excel şablonu. */
export async function GET() {
  if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });

  const file = await buildTemplate();
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="urun-sablonu.xlsx"`,
    },
  });
}
