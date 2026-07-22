export async function downloadFileFromResponse(
  response: Response,
  fallbackName = "document.pdf",
): Promise<void> {
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename\*=UTF-8''(.+)$/);
  const fileName = match ? decodeURIComponent(match[1]) : fallbackName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
