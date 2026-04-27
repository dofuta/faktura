import OpenAI from "openai";
import { addMonths, format, lastDayOfMonth } from "date-fns";
import type { Client } from "../db/schema.js";
import { loadEnv } from "../config/env.js";
import { parseInvoiceDraft, type InvoiceDraft } from "../invoice/schema.js";

export type DraftGenerationInput = {
  client: Client;
  naturalLanguage: string;
  title?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
};

function defaultIssueDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultDueDate(): string {
  return format(lastDayOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd");
}

export async function generateDraftWithOpenAi(input: DraftGenerationInput): Promise<InvoiceDraft> {
  const env = loadEnv();
  if (!env.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const issueDate = input.issueDate || defaultIssueDate();
  const dueDate = input.dueDate || defaultDueDate();

  const completion = await client.chat.completions.create({
    model: env.openAiModel,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You convert Japanese natural language invoice instructions into strict JSON. Return only JSON. Do not include totals because the CLI calculates totals.",
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
            title: input.title ?? "",
            issueDate,
            dueDate,
            notes: input.notes ?? "",
          },
          instruction: input.naturalLanguage,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI returned an empty draft.");
  }

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
