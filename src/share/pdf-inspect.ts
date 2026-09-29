// PDF のバイト列を軽く検査する（正式なパーサではなく、ヘッダー・暗号化・ページ数の目安だけ）。
import { bytesToBinaryString } from './base64';

export interface PdfInfo {
  isPdf: boolean;
  encrypted: boolean;
  /** 読み取れなければ null（圧縮オブジェクトストリーム内など） */
  pageCount: number | null;
}

const HEADER_SCAN_BYTES = 1024;

function countFromPagesDictionaries(text: string): number | null {
  const dictionaries = text.match(/<<[^<>]*\/Type\s*\/Pages(?![A-Za-z])[^<>]*>>/g) ?? [];
  const counts = dictionaries
    .map((d) => /\/Count\s+(\d+)/.exec(d)?.[1])
    .filter((v): v is string => v !== undefined)
    .map(Number);
  return counts.length > 0 ? Math.max(...counts) : null;
}

function countPageObjects(text: string): number | null {
  const n = (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
  return n > 0 ? n : null;
}

export function inspectPdfBytes(bytes: Uint8Array): PdfInfo {
  const head = bytesToBinaryString(bytes.subarray(0, HEADER_SCAN_BYTES));
  if (!head.includes('%PDF-')) return { isPdf: false, encrypted: false, pageCount: null };
  const text = bytesToBinaryString(bytes);
  return {
    isPdf: true,
    encrypted: /\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\s*<</.test(text),
    pageCount: countFromPagesDictionaries(text) ?? countPageObjects(text),
  };
}
