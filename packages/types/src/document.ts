export interface Document {
  id: string;
  name: string;
  size: number;
  uploadDate: Date;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
  storageUrl?: string;
}
