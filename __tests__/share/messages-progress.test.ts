import { failureMessage, FAILURE_REASONS } from '../../src/share/failure-messages';
import { describeProgress, SHARE_STEPS } from '../../src/share/progress';

describe('failureMessage', () => {
  it('すべての理由に日本語の1文以上のメッセージがあり、次の一手（写真/再試行）に触れる', () => {
    for (const reason of FAILURE_REASONS) {
      const m = failureMessage(reason);
      expect(m.length).toBeGreaterThan(10);
      expect(/[ぁ-ん]/.test(m)).toBe(true);
      expect(/写真|もう一度|確認|解除|小さく/.test(m)).toBe(true);
    }
  });

  it('読み込めないファイルの例文と同じ趣旨（写真で撮って読み込める）を含む', () => {
    expect(failureMessage('unreadable')).toContain('写真で撮って読み込めます');
  });
});

describe('describeProgress', () => {
  it('複数ページなら ページ数 と 手順 n/total を出す', () => {
    const d = describeProgress({ step: 3, total: SHARE_STEPS.length, pageCount: 5 });
    expect(d.title).toBe('読み込み中...');
    expect(d.detail).toContain('全5ページ');
    expect(d.detail).toContain('3/4');
    expect(d.ratio).toBeCloseTo(3 / 4);
  });

  it('1ページ・不明ならページ数は出さない', () => {
    expect(describeProgress({ step: 1, total: 4, pageCount: 1 }).detail).not.toContain('ページ');
    expect(describeProgress({ step: 1, total: 4, pageCount: null }).detail).not.toContain('ページ');
  });

  it('待機中(step 0)は 0% でも「読み込み中」を出す', () => {
    const d = describeProgress({ step: 0, total: 4, pageCount: null });
    expect(d.title).toBe('読み込み中...');
    expect(d.ratio).toBe(0);
  });
});
