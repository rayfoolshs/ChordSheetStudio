import html2canvas from 'html2canvas';

/**
 * True only when running as an iOS/iPadOS Home Screen (standalone) web app,
 * where Safari's native window.print() dialog is unavailable.
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
}

export function isStandaloneIOS(): boolean {
  if (!isIOSDevice()) return false;
  const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const mediaStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return navStandalone || mediaStandalone;
}

/** Turns a song title into a filesystem-safe name without an extension. */
export function safeFileName(title: string, fallback = 'chord-sheet'): string {
  const cleaned = (title || '')
    .trim()
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-');
  return cleaned || fallback;
}

/** Saves a generated blob to the user's downloads using a temporary anchor. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function buildA4Pdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number): Blob {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;

  const encoder = new TextEncoder();
  const chunks: (Uint8Array | string)[] = [];
  const offsets: number[] = [];
  let offset = 0;

  function push(value: Uint8Array | string) {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    offset += bytes.length;
  }

  function beginObject(index: number) {
    offsets[index] = offset;
    push(`${index} 0 obj\n`);
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  beginObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  beginObject(2);
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  beginObject(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );
  beginObject(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  push(jpeg);
  push('\nendstream\nendobj\n');

  const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(
    2
  )} cm\n/Im0 Do\nQ\n`;
  beginObject(5);
  push(`<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  const xrefStart = offset;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i += 1) {
    push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export async function renderElementToA4Pdf(
  element: HTMLElement,
  title: string
): Promise<{ blob: Blob; previewUrl: string; fileName: string }> {
  document.body.classList.add('is-capturing');
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#fffdf8',
      scale: 3,
      useCORS: true,
      logging: false,
    });
    const previewUrl = canvas.toDataURL('image/jpeg', 0.94);
    const jpeg = base64ToBytes(previewUrl.split(',')[1]);
    const blob = buildA4Pdf(jpeg, canvas.width, canvas.height);
    return {
      blob,
      previewUrl,
      fileName: `${safeFileName(title)}.pdf`,
    };
  } finally {
    document.body.classList.remove('is-capturing');
  }
}

/** Renders the A4 sheet to a high-resolution PNG blob for direct download. */
export async function renderElementToPng(
  element: HTMLElement,
  title: string
): Promise<{ blob: Blob; fileName: string }> {
  document.body.classList.add('is-capturing');
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#fffdf8',
      scale: 3,
      useCORS: true,
      logging: false,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Could not render the sheet as an image'));
      }, 'image/png');
    });
    return { blob, fileName: `${safeFileName(title)}.png` };
  } finally {
    document.body.classList.remove('is-capturing');
  }
}

export function computePrintZoom(paperElement: HTMLElement | null): number {
  if (!paperElement) return 1;
  const sheetBody = paperElement.querySelector('.sheet-body') as HTMLElement | null;
  if (!sheetBody) return 1;

  const MM_TO_PX = 96 / 25.4;
  const PRINT_SHEET_HEIGHT_PX = 295 * MM_TO_PX;

  document.body.classList.add('is-fitting');
  const measured = sheetBody.scrollHeight;
  const footer = paperElement.querySelector('.sheet-footer') as HTMLElement | null;
  const footerHeight = footer ? footer.offsetHeight : 0;
  document.body.classList.remove('is-fitting');

  if (!measured) return 1;
  const available = PRINT_SHEET_HEIGHT_PX - 2 * (12 * MM_TO_PX) - footerHeight - 4 * MM_TO_PX;
  return Math.max(0.25, Math.min(1, available / measured));
}
