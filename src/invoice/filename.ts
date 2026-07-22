function sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

export function buildPdfFileName(
  issueDate: string,
  clientName: string,
  language: "ja" | "en",
  prefix = "INVOICE",
): string {
  const compactIssueDate = issueDate.replaceAll("-", "");
  const displayName =
    language === "ja" && !clientName.endsWith("様") ? `${clientName}様` : clientName;
  const safeName = sanitizeFileNamePart(displayName) || "client";
  return `${prefix}_${compactIssueDate}_${safeName}.pdf`;
}
