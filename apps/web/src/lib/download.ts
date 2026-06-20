export async function triggerDownload(documentId: string, filename: string) {
  const res = await fetch(`/api/documents/${documentId}/download`);
  if (!res.ok) {
    console.error("Failed to get download URL:", await res.text());
    return;
  }
  const { url } = await res.json();
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}