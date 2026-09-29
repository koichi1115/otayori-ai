import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../src/share/run-share-import', () => ({ runShareImport: jest.fn() }));
jest.mock('../../src/share/file-store', () => ({ fileStore: {} }));
jest.mock('../../src/services/llm', () => ({ analyzePDF: jest.fn() }));
jest.mock('../../src/services/document-import', () => ({ saveAnalysisResult: jest.fn(), notifyAfterSave: jest.fn() }));

import { useShareImportFlow, type FlowState } from '../../src/share/use-share-import-flow';
import { runShareImport } from '../../src/share/run-share-import';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const payload = { uri: 'file:///a.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', size: 10 };

function Probe(props: { source: any; onDone: (id: number) => void; out: { state?: FlowState } }) {
  props.out.state = useShareImportFlow(props.source, props.onDone, 50);
  return null;
}

const flush = () => act(async () => { await Promise.resolve(); });

describe('useShareImportFlow', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
  afterEach(() => jest.useRealTimers());

  it('画面が出た直後から「読み込み中」（source 未到着でも無反応にしない）', () => {
    const out: any = {};
    act(() => { TestRenderer.create(<Probe source={null} onDone={jest.fn()} out={out} />); });
    expect(out.state.phase).toBe('running');
    expect(out.state.progress.step).toBe(0);
  });

  it('source が来ないまま待ち時間を超えたら not_received で失敗表示', () => {
    const out: any = {};
    act(() => { TestRenderer.create(<Probe source={null} onDone={jest.fn()} out={out} />); });
    act(() => { jest.advanceTimersByTime(60); });
    expect(out.state).toMatchObject({ phase: 'failed', reason: 'not_received' });
  });

  it('source が失敗（リンクのみ）なら即その理由で失敗表示', () => {
    const out: any = {};
    act(() => { TestRenderer.create(<Probe source={{ ok: false, reason: 'not_a_file' }} onDone={jest.fn()} out={out} />); });
    expect(out.state).toMatchObject({ phase: 'failed', reason: 'not_a_file' });
  });

  it('成功したら進捗を更新し、onDone(docId) を1回だけ呼ぶ', async () => {
    (runShareImport as jest.Mock).mockImplementation(async (_p: any, _d: any, onProgress: any) => {
      onProgress({ step: 3, total: 4, pageCount: 3 });
      return { ok: true, docId: 9 };
    });
    const out: any = {}; const onDone = jest.fn();
    let r: any;
    act(() => { r = TestRenderer.create(<Probe source={{ ok: true, payload }} onDone={onDone} out={out} />); });
    await flush();
    expect(onDone).toHaveBeenCalledWith(9);
    act(() => { r.update(<Probe source={{ ok: true, payload }} onDone={onDone} out={out} />); });
    await flush();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(runShareImport).toHaveBeenCalledTimes(1);
  });

  it('失敗したら reason を保持する', async () => {
    (runShareImport as jest.Mock).mockResolvedValue({ ok: false, reason: 'unreadable' });
    const out: any = {};
    act(() => { TestRenderer.create(<Probe source={{ ok: true, payload }} onDone={jest.fn()} out={out} />); });
    await flush();
    expect(out.state).toMatchObject({ phase: 'failed', reason: 'unreadable' });
  });

  it('想定外の例外でも失敗表示になる（無反応にしない）', async () => {
    (runShareImport as jest.Mock).mockRejectedValue(new Error('boom'));
    const out: any = {};
    act(() => { TestRenderer.create(<Probe source={{ ok: true, payload }} onDone={jest.fn()} out={out} />); });
    await flush();
    expect(out.state).toMatchObject({ phase: 'failed', reason: 'unreadable' });
  });

  it('解析中に共有データが消えても（アプリ切替で reset）、待機タイムアウトで失敗表示に変えない', async () => {
    let resolveRun: (v: any) => void = () => {};
    (runShareImport as jest.Mock).mockImplementation(() => new Promise((r) => { resolveRun = r; }));
    const out: any = {}; const onDone = jest.fn();
    let r: any;
    act(() => { r = TestRenderer.create(<Probe source={{ ok: true, payload }} onDone={onDone} out={out} />); });
    act(() => { r.update(<Probe source={null} onDone={onDone} out={out} />); });
    act(() => { jest.advanceTimersByTime(200); });
    expect(out.state.phase).toBe('running');
    resolveRun({ ok: true, docId: 3 });
    await flush();
    expect(onDone).toHaveBeenCalledWith(3);
  });
});
