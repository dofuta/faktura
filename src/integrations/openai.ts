import OpenAI from "openai";
import { addMonths, format, lastDayOfMonth } from "date-fns";
import type { Client } from "../db/schema.js";
import { loadEnv } from "../config/env.js";
import { parseInvoiceDraft, type InvoiceDraft } from "../invoice/schema.js";

export type DraftGenerationInput = {
  client: Client;
  naturalLanguage: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
};

export type DraftGenerationProgress = {
  message: string;
  elapsedMs: number;
  model?: string;
};

export type DraftGenerationOptions = {
  onProgress?: (progress: DraftGenerationProgress) => void;
};

function defaultIssueDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultDueDate(): string {
  return format(lastDayOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd");
}

export async function generateDraftWithOpenAi(
  input: DraftGenerationInput,
  options: DraftGenerationOptions = {},
): Promise<InvoiceDraft> {
  const startedAt = Date.now();
  const emitProgress = (message: string, model?: string) => {
    options.onProgress?.({
      message,
      elapsedMs: Date.now() - startedAt,
      model,
    });
  };

  const env = loadEnv();
  if (!env.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  emitProgress(`OpenAIクライアントを準備しています (model: ${env.openAiModel})`, env.openAiModel);
  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const issueDate = input.issueDate || defaultIssueDate();
  const dueDate = input.dueDate || defaultDueDate();

  emitProgress("OpenAIへリクエストを送信しています", env.openAiModel);
  const completion = await client.chat.completions.create({
    model: env.openAiModel,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You convert Japanese natural language invoice instructions into strict JSON. Return only JSON. Generate a concise invoice title from the instruction. Do not include totals because the CLI calculates totals.",
      },
      {
        role: "user",
        content: JSON.stringify({
          requiredShape: {
            client: {
              id: "number",
              name: "string",
              email: "string",
              address: "string",
              language: "ja or en",
            },
            title: "string",
            issueDate: "YYYY-MM-DD",
            dueDate: "YYYY-MM-DD",
            items: [
              {
                description: "string",
                unitPrice: "number",
                quantity: "number",
                taxRate: "number between 0 and 1",
              },
            ],
            notes: "string",
          },
          selectedClient: input.client,
          defaults: {
            issueDate,
            dueDate,
            notes: input.notes ?? "",
          },
          titleGuidance:
            "Generate a concise invoice subject in the selected client's language. For Japanese, use a short noun phrase like 'Webサイト実装費用' without honorifics or a trailing period.",
          instruction: input.naturalLanguage,
        }),
      },
    ],
  });

  emitProgress("OpenAIから応答を受信しました", env.openAiModel);
  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI returned an empty draft.");
  }

  emitProgress("応答JSONを検証しています", env.openAiModel);
  const parsed = JSON.parse(content) as unknown;
  const draft = parseInvoiceDraft(parsed);

  return {
    ...draft,
    client: {
      id: input.client.id,
      name: input.client.name,
      email: input.client.email,
      address: input.client.address,
      language: input.client.language,
    },
  };
}
