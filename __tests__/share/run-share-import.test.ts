import { runShareImport } from '../../src/share/run-share-import';
import type { FileStore } from '../../src/share/types';

const enc = (s: string) => Uint8Array.from(Buffer.from(s, 'latin1'));
const PDF3 = enc('%PDF-1.4\n<< /Type /Pages /Count 3 >>');

type Deps = { store: FileStore; analyze: jest.Mock; save: jest.Mock; notify: jest.Mock };
function makeDeps(over: Partial<{ store: Partial<FileStore>; analyze: jest.Mock; save: jest.Mock; notify: jest.Mock }> = {}) {
  const store: FileStore = {
    copyToAppStorage: jest.fn(async (_src: string, name: string) => ({ uri: `file:///app/shared-inbox/${name}`, size: PDF3.length })),
    readBytes: jest.fn(async () => PDF3),
    remove: jest.fn(async () => {}),
    ...over.store,
  } as FileStore;
  const analyze = over.analyze ?? jest.fn(async () => ({ title: 't', source: 's', category: 'notice' as const, summary: '', suggestedFileName: '', events: [], todos: [], items: [] }));
  const save = over.save ?? jest.fn(async () => 7);
  const notify = over.notify ?? jest.fn();
  return { store, analyze, save, notify } as Deps;
}
const payload = { uri: 'file:///group/x.pdf', fileName: '連絡帳.pdf', mimeType: 'application/pdf', size: 100 };

describe('runShareImport', () => {
  it('成功: コピー→確認→解析→保存の順に進捗を出し、docId を返す。元ファイルは消す', async () => {
    const deps = makeDeps();
    const steps: any[] = [];
    const r = await runShareImport(payload, deps, (p) => steps.push(p));
    expect(r).toEqual({ ok: true, docId: 7 });
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4]);
    expect(steps[2].pageCount).toBe(3); // 確認後にページ数が分かる
    expect(deps.analyze).toHaveBeenCalledWith(Buffer.from(PDF3).toString('base64'), 'application/pdf');
    const saveArg = deps.save.mock.calls[0][0];
    expect(saveArg.uri).toContain('/app/shared-inbox/'); // アプリ領域のパスを保存
    expect(saveArg.fileName).toBe('連絡帳.pdf');
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.store.remove).toHaveBeenCalledWith('file:///group/x.pdf');
  });

  it('PDF/画像でなければコピーもせず not_supported', async () => {
    const deps = makeDeps();
    const r = await runShareImport({ ...payload, fileName: 'a.txt', mimeType: 'text/plain' }, deps, () => {});
    expect(r).toEqual({ ok: false, reason: 'not_supported' });
    expect(deps.store.copyToAppStorage).not.toHaveBeenCalled();
    expect(deps.analyze).not.toHaveBeenCalled();
  });

  it('サイズ 0 は empty、巨大は too_large（解析を呼ばない）', async () => {
    const d1 = makeDeps();
    expect(await runShareImport({ ...payload, size: 0 }, d1, () => {})).toEqual({ ok: false, reason: 'empty' });
    const d2 = makeDeps();
    expect(await runShareImport({ ...payload, size: 999_999_999 }, d2, () => {})).toEqual({ ok: false, reason: 'too_large' });
    expect(d1.analyze).not.toHaveBeenCalled();
    expect(d2.analyze).not.toHaveBeenCalled();
  });

  it('コピー後の実サイズで empty / too_large を再判定する（サイズ不明で来た場合）', async () => {
    const deps = makeDeps({ store: { copyToAppStorage: jest.fn(async (_s: string, n: string) => ({ uri: `file:///c/${n}`, size: 0 })) } });
    expect(await runShareImport({ ...payload, size: null }, deps, () => {})).toEqual({ ok: false, reason: 'empty' });
    expect(deps.store.remove).toHaveBeenCalledWith('file:///c/連絡帳.pdf');
  });

  it('コピー失敗は unreadable', async () => {
    const deps = makeDeps({ store: { copyToAppStorage: jest.fn(async () => { throw new Error('ENOENT'); }) } });
    expect(await runShareImport(payload, deps, () => {})).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('拡張子は .pdf でも中身が PDF でなければ unreadable、コピーは消す', async () => {
    const deps = makeDeps({ store: { readBytes: jest.fn(async () => enc('<html></html>')) } });
    expect(await runShareImport(payload, deps, () => {})).toEqual({ ok: false, reason: 'unreadable' });
    expect(deps.store.remove).toHaveBeenCalledWith('file:///app/shared-inbox/連絡帳.pdf'); // コピーを残さない
    expect(deps.store.remove).toHaveBeenCalledWith('file:///group/x.pdf'); // 元の一時ファイルも片付ける
  });

  it('暗号化 PDF は encrypted', async () => {
    const deps = makeDeps({ store: { readBytes: jest.fn(async () => enc('%PDF-1.6\n/Encrypt 5 0 R')) } });
    expect(await runShareImport(payload, deps, () => {})).toEqual({ ok: false, reason: 'encrypted' });
    expect(deps.analyze).not.toHaveBeenCalled();
  });

  it('画像は PDF ヘッダー検査をせず解析へ進む', async () => {
    const deps = makeDeps({ store: { readBytes: jest.fn(async () => Uint8Array.from([0xff, 0xd8, 0xff])) } });
    const r = await runShareImport({ ...payload, fileName: 'a.jpg', mimeType: 'image/jpeg' }, deps, () => {});
    expect(r).toEqual({ ok: true, docId: 7 });
    expect(deps.analyze).toHaveBeenCalledWith(expect.any(String), 'image/jpeg');
  });

  it('解析がネットワークエラーなら network、それ以外は analysis', async () => {
    const d1 = makeDeps({ analyze: jest.fn(async () => { throw new Error('ネットワーク接続に失敗しました。インターネット接続を確認してください。'); }) });
    expect(await runShareImport(payload, d1, () => {})).toEqual({ ok: false, reason: 'network' });
    const d2 = makeDeps({ analyze: jest.fn(async () => { throw new Error('AI応答のJSON解析に失敗しました'); }) });
    expect(await runShareImport(payload, d2, () => {})).toEqual({ ok: false, reason: 'analysis' });
    expect(d2.save).not.toHaveBeenCalled();
  });

  it('保存失敗は save', async () => {
    const deps = makeDeps({ save: jest.fn(async () => { throw new Error('db'); }) });
    expect(await runShareImport(payload, deps, () => {})).toEqual({ ok: false, reason: 'save' });
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it('通知(notify)の失敗は成功を妨げない', async () => {
    const deps = makeDeps({ notify: jest.fn(() => { throw new Error('line'); }) });
    expect(await runShareImport(payload, deps, () => {})).toEqual({ ok: true, docId: 7 });
  });
});
