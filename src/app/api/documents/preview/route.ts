import { NextResponse } from "next/server";
import { quickDocumentFormSchema } from "@/invoice/documentFormSchema";
import { renderInvoiceHtml } from "@/invoice/render";
import { buildQuickDocumentRenderInput } from "@/server/documents";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = quickDocumentFormSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const renderInput = await buildQuickDocumentRenderInput(parsed.data);
    return new Response(renderInvoiceHtml(renderInput), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
