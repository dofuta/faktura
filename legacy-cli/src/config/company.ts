import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { z } from "zod";
import { loadEnv } from "./env.js";

export const companySchema = z.object({
  name: z.string().min(1),
  postalCode: z.string().optional().default(""),
  address: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  registrationNumber: z.string().optional().default(""),
  invoiceNotes: z.string().optional().default(""),
  bank: z
    .object({
      name: z.string().min(1),
      branch: z.string().optional().default(""),
      accountType: z.string().optional().default(""),
      accountNumber: z.string().optional().default(""),
      accountHolder: z.string().optional().default(""),
    })
    .optional(),
});

export type Company = z.infer<typeof companySchema>;

export async function loadCompany(): Promise<Company> {
  const env = loadEnv();
  const raw = await readFile(env.companyConfigPath, "utf8");
  return companySchema.parse(YAML.parse(raw));
}
