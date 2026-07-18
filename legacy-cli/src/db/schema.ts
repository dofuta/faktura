export type Client = {
  id: number;
  name: string;
  email: string;
  address: string;
  language: "ja" | "en";
  createdAt: string;
  updatedAt: string;
};

export type InvoiceRecord = {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  title: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  draftPath: string;
  pdfPath: string;
  googleDriveFileId?: string;
  googleDriveUrl?: string;
  createdAt: string;
};

export type NewClient = {
  name: string;
  email?: string;
  address?: string;
  language?: "ja" | "en";
};
