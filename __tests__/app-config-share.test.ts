// 共有取込に必要なネイティブ設定が app.json に入っているかを守るテスト（設定の退行防止）。
const appJson = require('../app.json');
const config = require('../app.config.js');

const expo = config.expo;
const shareIntentPlugin = expo.plugins.find((p: any) => Array.isArray(p) && p[0] === 'expo-share-intent');
const rule: unknown = shareIntentPlugin?.[1]?.iosActivationRules;

describe('共有拡張（expo-share-intent）の設定', () => {
  it('URL scheme が設定されている（共有拡張がアプリを開き直すために必須）', () => {
    expect(expo.scheme).toBe('otayori-ai');
  });

  it('有効化ルールは PDF と画像とファイルを受ける', () => {
    expect(typeof rule).toBe('string'); // 述語（SUBQUERY）形式
    const text = rule as string;
    expect(text).toContain('com.adobe.pdf');
    expect(text).toContain('public.image');
    expect(text).toContain('public.file-url');
  });

  it('Safari 等が「PDF + URL」の複数アイテムで渡しても外れない（== 1 で固定しない）', () => {
    const text = rule as string;
    expect(text).not.toMatch(/@count\s*==\s*1\s*$/);
    expect(text).toMatch(/@count\s*>=\s*1\s*$/);
  });

  it('リンク・テキストだけの共有ではぷりかん！を出さない', () => {
    const text = rule as string;
    expect(text).not.toContain('public.url"');
    expect(text).not.toContain('public.plain-text');
  });
});

describe('「このアプリで開く」（CFBundleDocumentTypes）', () => {
  const types = appJson.expo.ios.infoPlist.CFBundleDocumentTypes;

  it('PDF と画像を宣言している', () => {
    const utis = types.flatMap((t: any) => t.LSItemContentTypes);
    expect(utis).toEqual(expect.arrayContaining(['com.adobe.pdf', 'public.jpeg', 'public.png', 'public.heic']));
  });

  it('既定アプリを奪わない（Alternate）', () => {
    for (const t of types) expect(t.LSHandlerRank).toBe('Alternate');
  });

  it('その場で開かない（アプリ領域の Inbox へコピーされる方式）', () => {
    expect(appJson.expo.ios.infoPlist.LSSupportsOpeningDocumentsInPlace).toBe(false);
  });
});

describe('既存設定の維持', () => {
  it('bundleId とバージョン系は変えていない', () => {
    expect(expo.ios.bundleIdentifier).toBe('com.otayori.ai');
    expect(expo.ios.buildNumber).toBe('47');
  });
});
