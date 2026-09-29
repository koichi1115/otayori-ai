// 取込の状態機械（読み込み中 → 完了 / 失敗）。画面はこの状態を描画するだけにする。
import { useEffect, useRef, useState } from 'react';
import { runShareImport } from './run-share-import';
import { fileStore } from './file-store';
import { analyzePDF } from '../services/llm';
import { saveAnalysisResult, notifyAfterSave } from '../services/document-import';
import type { PayloadResult } from './shared-payload';
import type { FailureReason, ImportDeps, ShareProgress } from './types';

export type FlowState =
  | { phase: 'running'; progress: ShareProgress }
  | { phase: 'failed'; reason: FailureReason };

const INITIAL_PROGRESS: ShareProgress = { step: 0, total: 4, pageCount: null };

/** 共有データが届くのを待つ最長時間。超えたら「受け取れなかった」を出す */
export const DEFAULT_WAIT_MS = 8000;

const defaultDeps = (): ImportDeps => ({
  store: fileStore,
  analyze: analyzePDF,
  save: saveAnalysisResult,
  notify: notifyAfterSave,
});

export function useShareImportFlow(
  source: PayloadResult | null,
  onDone: (docId: number) => void,
  waitMs: number = DEFAULT_WAIT_MS,
): FlowState {
  const [state, setState] = useState<FlowState>({ phase: 'running', progress: INITIAL_PROGRESS });
  const startedUri = useRef<string | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // 届かないまま時間切れ
  useEffect(() => {
    if (source || startedUri.current) return; // 処理が始まっていれば待たない
    const timer = setTimeout(() => setState({ phase: 'failed', reason: 'not_received' }), waitMs);
    return () => clearTimeout(timer);
  }, [source, waitMs]);

  // 届いたものを処理（同じファイルは1回だけ、別のファイルが来たらやり直す）
  useEffect(() => {
    if (!source) return;
    if (!source.ok) {
      setState({ phase: 'failed', reason: source.reason });
      return;
    }
    if (startedUri.current === source.payload.uri) return;
    startedUri.current = source.payload.uri;
    setState({ phase: 'running', progress: INITIAL_PROGRESS });
    runShareImport(source.payload, defaultDeps(), (progress) => setState({ phase: 'running', progress }))
      .then((result) => {
        if (result.ok) onDoneRef.current(result.docId);
        else setState({ phase: 'failed', reason: result.reason });
      })
      .catch(() => setState({ phase: 'failed', reason: 'unreadable' }));
  }, [source]);

  return state;
}
