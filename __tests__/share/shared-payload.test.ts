import { toSharedPayload } from '../../src/share/shared-payload';

const base = { text: null, webUrl: null, type: null, meta: null } as any;

describe('toSharedPayload', () => {
  it('先頭ファイルを取り出し、パスに file:// を付ける', () => {
    const r = toSharedPayload({
      ...base, type: 'file',
      files: [{ path: '/private/var/group/x.pdf', fileName: '連絡帳.pdf', mimeType: 'application/pdf', size: 42, width: null, height: null, duration: null }],
    });
    expect(r).toEqual({ ok: true, payload: { uri: 'file:///private/var/group/x.pdf', fileName: '連絡帳.pdf', mimeType: 'application/pdf', size: 42 } });
  });

  it('すでに file:// ならそのまま', () => {
    const r = toSharedPayload({ ...base, files: [{ path: 'file:///a/b.pdf', fileName: 'b.pdf', mimeType: 'application/pdf', size: null }] });
    expect(r.ok && r.payload.uri).toBe('file:///a/b.pdf');
  });

  it('ファイル名が無ければパス末尾を使う', () => {
    const r = toSharedPayload({ ...base, files: [{ path: 'file:///a/b.pdf', fileName: null, mimeType: null, size: null }] });
    expect(r.ok && r.payload.fileName).toBe('b.pdf');
  });

  it('リンクだけの共有は not_a_file', () => {
    expect(toSharedPayload({ ...base, type: 'weburl', webUrl: 'https://example.com/a.pdf', text: 'https://example.com/a.pdf', files: null }))
      .toEqual({ ok: false, reason: 'not_a_file' });
  });

  it('テキストだけの共有は not_a_file', () => {
    expect(toSharedPayload({ ...base, type: 'text', text: 'こんにちは', files: null }))
      .toEqual({ ok: false, reason: 'not_a_file' });
  });

  it('何も入っていなければ not_received', () => {
    expect(toSharedPayload({ ...base, files: null })).toEqual({ ok: false, reason: 'not_received' });
    expect(toSharedPayload({ ...base, files: [] })).toEqual({ ok: false, reason: 'not_received' });
    expect(toSharedPayload(null)).toEqual({ ok: false, reason: 'not_received' });
  });
});

import { pickSource } from '../../src/share/shared-payload';

describe('pickSource', () => {
  const file = { files: [{ path: '/a/b.pdf', fileName: 'b.pdf', mimeType: 'application/pdf', size: 3 }], text: null, webUrl: null };

  it('共有拡張の値があればそれを使う', () => {
    const r = pickSource({ hasShareIntent: true, shareIntent: file as any, error: null, fileUri: undefined });
    expect(r).toMatchObject({ ok: true, payload: { uri: 'file:///a/b.pdf' } });
  });

  it('「このアプリで開く」の file URL があればそれを使う', () => {
    const r = pickSource({ hasShareIntent: false, shareIntent: null, error: null, fileUri: 'file:///x/Inbox/c%20d.pdf' });
    expect(r).toMatchObject({ ok: true, payload: { uri: 'file:///x/Inbox/c%20d.pdf', fileName: 'c d.pdf' } });
  });

  it('共有拡張のエラーは not_received', () => {
    expect(pickSource({ hasShareIntent: false, shareIntent: null, error: 'appGroupIdentifier is nil', fileUri: undefined }))
      .toEqual({ ok: false, reason: 'not_received' });
  });

  it('まだ何も届いていなければ null（待機）', () => {
    expect(pickSource({ hasShareIntent: false, shareIntent: null, error: null, fileUri: undefined })).toBeNull();
  });
});
