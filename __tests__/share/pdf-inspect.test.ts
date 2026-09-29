import { inspectPdfBytes } from '../../src/share/pdf-inspect';

const bytes = (s: string) => Uint8Array.from(Buffer.from(s, 'latin1'));

describe('inspectPdfBytes', () => {
  it('%PDF- ヘッダーがあれば PDF', () => {
    expect(inspectPdfBytes(bytes('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>')).isPdf).toBe(true);
  });

  it('先頭に少しゴミがあっても 1024 バイト以内なら PDF', () => {
    expect(inspectPdfBytes(bytes('\n\n  %PDF-1.4\n')).isPdf).toBe(true);
  });

  it('ヘッダーが無ければ PDF ではない', () => {
    expect(inspectPdfBytes(bytes('<html>not a pdf</html>')).isPdf).toBe(false);
    expect(inspectPdfBytes(new Uint8Array(0)).isPdf).toBe(false);
  });

  it('ページツリーの /Count からページ数を取る（最大値＝ルート）', () => {
    const s = '%PDF-1.4\n<< /Type /Pages /Kids [2 0 R] /Count 3 >>\n<< /Type /Pages /Count 1 /Parent 1 0 R >>';
    expect(inspectPdfBytes(bytes(s)).pageCount).toBe(3);
  });

  it('/Count が無ければ /Type /Page の個数を数える（/Pages は数えない）', () => {
    const s = '%PDF-1.4\n<< /Type /Page >>\n<< /Type/Page /X 1 >>\n<< /Type /Pages >>';
    expect(inspectPdfBytes(bytes(s)).pageCount).toBe(2);
  });

  it('ページ数が読めなければ null（圧縮オブジェクト等）', () => {
    expect(inspectPdfBytes(bytes('%PDF-1.5\nstream....endstream')).pageCount).toBeNull();
  });

  it('/Encrypt があれば encrypted', () => {
    expect(inspectPdfBytes(bytes('%PDF-1.6\ntrailer << /Encrypt 5 0 R >>')).encrypted).toBe(true);
    expect(inspectPdfBytes(bytes('%PDF-1.6\ntrailer << /Root 1 0 R >>')).encrypted).toBe(false);
  });
});
