import OpenAI from "openai";
import { z } from "zod";
import type { Client } from "@/db/schema";
import { DEFAULT_OPENAI_MODEL, SETTING_KEYS, getSetting } from "@/lib/settings";

const aiDraftSchema = z.object({
  title: z.string().default(""),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        unitPrice: z.number().nonnegative(),
        quantity: z.number().positive(),
        taxRate: z.number().min(0).max(1),
      }),
    )
    .min(1),
  notes: z.string().default(""),
});

export type AiDraft = z.infer<typeof aiDraftSchema>;

export type AiDraftInput = {
  client: Pick<Client, "name" | "language">;
  instruction: string;
  issueDate: string;
  dueDate: string;
  notes: string;
};

export async function generateDraftWithAi(input: AiDraftInput): Promise<AiDraft> {
  const apiKey = await getSetting(SETTING_KEYS.openaiApiKey);
  if (!apiKey) {
    throw new Error("OpenAI APIキーが未設定です。設定画面から登録してください。");
  }
  const model = (await getSetting(SETTING_KEYS.openaiModel)) ?? DEFAULT_OPENAI_MODEL;

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You convert natural language invoice instructions into strict JSON. Return only JSON. Generate a concise invoice title from the instruction. Do not include totals because the app calculates totals.",
      },
      {
        role: "user",
        content: JSON.stringify({
          requiredShape: {
            title: "string",
            issueDate: "YYYY-MM-DD",
            dueDate: "YYYY-MM-DD, or empty string when no due date is specified",
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
          client: { name: input.client.name, language: input.client.language },
          defaults: {
            issueDate: input.issueDate,
            dueDate: input.dueDate,
            notes: input.notes,
          },
          titleGuidance:
            "Generate a concise invoice subject in the client's language. For Japanese, use a short noun phrase like 'Webサイト実装費用' without honorifics or a trailing period.",
          instruction: input.instruction,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAIの応答が空でした。");
  }

  return aiDraftSchema.parse(JSON.parse(content));
}
