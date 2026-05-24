// Module-level store persists across client-side navigation within the same tab.
let _data: Uint8Array | null = null;
let _name = "";

export async function storePdf(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  _data = new Uint8Array(buf);
  _name = file.name;
  sessionStorage.setItem("pdfName", file.name);
}

export function getPdfData(): Uint8Array | null {
  return _data;
}

export function getPdfName(): string {
  return _name || sessionStorage.getItem("pdfName") || "";
}

export function hasPdf(): boolean {
  return _data !== null;
}
