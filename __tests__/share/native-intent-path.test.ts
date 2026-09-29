import { resolveSystemPath, SHARE_IMPORT_ROUTE } from '../../src/share/native-intent-path';

describe('resolveSystemPath', () => {
  it('共有拡張が開く URL を共有取込画面へ振り替える', () => {
    expect(resolveSystemPath('otayori-ai://dataUrl=otayori-aiShareKey?nonce=ABC#file')).toBe(SHARE_IMPORT_ROUTE);
    expect(resolveSystemPath('/dataUrl=otayori-aiShareKey?nonce=ABC#weburl')).toBe(SHARE_IMPORT_ROUTE);
  });

  it('通常のパスはそのまま返す', () => {
    expect(resolveSystemPath('/history')).toBe('/history');
    expect(resolveSystemPath('otayori-ai://analysis-result?docId=1')).toBe('otayori-ai://analysis-result?docId=1');
  });

  it('壊れた入力でも例外を出さずルートへ', () => {
    expect(resolveSystemPath(undefined as any)).toBe('/');
    expect(resolveSystemPath(null as any)).toBe('/');
  });
});
