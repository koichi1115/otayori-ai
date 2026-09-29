import { classifySharedFile, MAX_SHARED_FILE_BYTES } from '../../src/share/classify-shared-file';

describe('classifySharedFile', () => {
  it('MIME が application/pdf なら PDF として受け付ける', () => {
    expect(classifySharedFile({ fileName: 'a.pdf', mimeType: 'application/pdf', size: 1000 }))
      .toEqual({ ok: true, kind: 'pdf', mimeType: 'application/pdf' });
  });

  it('MIME が不明でも拡張子が .pdf なら PDF（大文字も可）', () => {
    expect(classifySharedFile({ fileName: 'おたより.PDF', mimeType: 'application/octet-stream', size: 1000 }))
      .toEqual({ ok: true, kind: 'pdf', mimeType: 'application/pdf' });
  });

  it('画像（jpeg / png / heic）は image として受け付ける', () => {
    expect(classifySharedFile({ fileName: 'a.jpg', mimeType: 'image/jpeg', size: 10 }))
      .toEqual({ ok: true, kind: 'image', mimeType: 'image/jpeg' });
    expect(classifySharedFile({ fileName: 'a.png', mimeType: null, size: 10 }))
      .toEqual({ ok: true, kind: 'image', mimeType: 'image/png' });
    expect(classifySharedFile({ fileName: 'a.HEIC', mimeType: null, size: 10 }))
      .toEqual({ ok: true, kind: 'image', mimeType: 'image/heic' });
  });

  it('PDF でも画像でもないものは not_supported', () => {
    expect(classifySharedFile({ fileName: 'memo.txt', mimeType: 'text/plain', size: 10 }))
      .toEqual({ ok: false, reason: 'not_supported' });
    expect(classifySharedFile({ fileName: 'noext', mimeType: null, size: 10 }))
      .toEqual({ ok: false, reason: 'not_supported' });
  });

  it('サイズ 0 は empty', () => {
    expect(classifySharedFile({ fileName: 'a.pdf', mimeType: 'application/pdf', size: 0 }))
      .toEqual({ ok: false, reason: 'empty' });
  });

  it('上限を超えると too_large、上限ちょうどは可', () => {
    expect(classifySharedFile({ fileName: 'a.pdf', mimeType: 'application/pdf', size: MAX_SHARED_FILE_BYTES + 1 }))
      .toEqual({ ok: false, reason: 'too_large' });
    expect(classifySharedFile({ fileName: 'a.pdf', mimeType: 'application/pdf', size: MAX_SHARED_FILE_BYTES }).ok)
      .toBe(true);
  });

  it('サイズ不明(null)はここでは弾かない（コピー後に実サイズで再判定する）', () => {
    expect(classifySharedFile({ fileName: 'a.pdf', mimeType: 'application/pdf', size: null }).ok).toBe(true);
  });
});
