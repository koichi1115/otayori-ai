import { bytesToBase64 } from '../../src/share/base64';

describe('bytesToBase64', () => {
  it('Buffer の base64 と一致する（小サイズ）', () => {
    const b = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(bytesToBase64(b)).toBe(Buffer.from(b).toString('base64'));
  });

  it('チャンク境界をまたぐ大きなデータでも一致する', () => {
    const b = new Uint8Array(100_003).map((_, i) => (i * 31) % 256);
    expect(bytesToBase64(b)).toBe(Buffer.from(b).toString('base64'));
  });

  it('空は空文字', () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe('');
  });
});
