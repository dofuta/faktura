import { NextResponse } from "next/server";
import { quickDocumentFormSchema } from "@/invoice/documentFormSchema";
import { buildPdfFileName } from "@/invoice/filename";
import { renderInvoiceHtml } from "@/invoice/render";
import { buildQuickDocumentRenderInput } from "@/server/documents";
import { renderPdfFromHtml } from "@/server/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = quickDocumentFormSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const renderInput = await buildQuickDocumentRenderInput(parsed.data);
    const html = renderInvoiceHtml(renderInput);
    const pdf = await renderPdfFromHtml(html);
    const fileName = buildPdfFileName(
      parsed.data.issueDate,
      renderInput.client.name,
      renderInput.language,
      "DELIVERY",
    );

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
