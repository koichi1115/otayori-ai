// 大きなバイト列を 1 文字ずつ連結せず、チャンク単位で文字列化する。
const CHUNK = 0x8000;

export function bytesToBinaryString(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]));
  }
  return parts.join('');
}

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(bytesToBinaryString(bytes));
}
