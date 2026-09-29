/**
 * ぷりかん！のデザイントークン（UIチューナー承認済み設定 2026-09-29 を反映）。
 * 画面（app/）には色・文字サイズ・太さ・角丸・影・タップ領域の直値を書かず、ここを参照する。
 *
 * 色の方針:
 *  - 地は #F5F5F5、カードは白、文字は #1C1C1E、補助文字は #636366、罫線は #E5E5EA。
 *  - アクセントは青 #2F6DB0 の1色だけ。ヘッダーと主ボタンなど要点にだけ使う。
 *  - 白文字を載せる背景は #2F6DB0 以上のコントラスト（比 5.3）が必要。#4A90D9（3.3）は使わない。
 *  - 黄・緑は線・点にしか使えない（文字色にしない）。意味は色だけで伝えず、アイコンか文言を添える。
 */
export const Colors = {
  // アクセント（青1色）
  primary: '#2F6DB0',
  onPrimary: '#FFFFFF',

  // 面と文字
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#636366',
  border: '#E5E5EA',

  // 危険（必ずアイコンか文言と一緒に使う）
  danger: '#D70015',

  // 点専用。文字色・文字の背景には使わない
  statusDot: '#34C759',

  // 重ね塗り・カメラ画面
  scrim: 'rgba(0,0,0,0.4)',
  cameraBackground: '#000000',
  onCamera: '#FFFFFF',
  cameraGuide: 'rgba(255,255,255,0.6)',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
};

/** 本文 400、見出し 700。900 は使わない。500/600 は項目名・ボタン用。 */
export const FontWeight = {
  body: '400',
  medium: '500',
  semibold: '600',
  heading: '700',
} as const;

/** 本文の行間は 1.55 倍。見出しは詰める（UIチューナーの見出し値に合わせる）。 */
export const LINE_HEIGHT_RATIO = 1.55;
export const LineHeight = (fontSize: number, ratio: number = LINE_HEIGHT_RATIO) =>
  Math.round(fontSize * ratio);

const text = (fontSize: number, fontWeight: (typeof FontWeight)[keyof typeof FontWeight], ratio?: number) => ({
  fontSize,
  fontWeight,
  lineHeight: LineHeight(fontSize, ratio),
});

/** 画面では `...Type.body` のように展開して使う。色は別に Colors から指定する。 */
export const Type = {
  body: text(FontSize.md, FontWeight.body),
  bodyMedium: text(FontSize.md, FontWeight.medium),
  bodyStrong: text(FontSize.md, FontWeight.semibold),
  caption: text(FontSize.sm, FontWeight.body),
  captionMedium: text(FontSize.sm, FontWeight.medium),
  captionStrong: text(FontSize.sm, FontWeight.semibold),
  small: text(FontSize.xs, FontWeight.body),
  smallStrong: text(FontSize.xs, FontWeight.semibold),
  lead: text(FontSize.lg, FontWeight.body),
  leadStrong: text(FontSize.lg, FontWeight.semibold),
  sectionTitle: text(FontSize.lg, FontWeight.heading, 1.35),
  title: text(FontSize.xl, FontWeight.heading, 1.35),
  display: text(FontSize.xxl, FontWeight.heading, 1.2),
} as const;

/** 影は弱く。 */
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

/** 角丸は 7 を基準にする。 */
export const BorderRadius = {
  sm: 5,
  md: 7,
  lg: 9,
  full: 9999,
} as const;

/** アプリアイコン画像の角丸（辺の長さに比例）。 */
export const appIconRadius = (size: number) => Math.round(size * 0.225);

export const BorderWidth = {
  none: 0,
  thin: 1,
} as const;

/** タップ領域は最小 48。 */
export const TouchTarget = { min: 48 } as const;

/** 小さなアイコンだけのボタン用。見た目は変えずに 48 x 48 のタップ領域にする。 */
export const IconButton = {
  minWidth: TouchTarget.min,
  minHeight: TouchTarget.min,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/** 見た目の大きさ (width x height) から、48 に足りない分の hitSlop を返す。 */
export const hitSlopFor = (width: number, height: number) => {
  const pad = (size: number) => Math.max(0, Math.ceil((TouchTarget.min - size) / 2));
  return { top: pad(height), bottom: pad(height), left: pad(width), right: pad(width) };
};

// --- コントラスト計算（WCAG 2.x 相対輝度） ---

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const luminance = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

export const contrastRatio = (a: string, b: string) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** 実際に使う文字色 x 背景の組み合わせ。テストで最小比を保証する。 */
export const ContrastPairs = [
  { label: '本文 / 地', fg: Colors.text, bg: Colors.background, min: 4.5 },
  { label: '本文 / カード', fg: Colors.text, bg: Colors.surface, min: 4.5 },
  { label: '補助文字 / 地', fg: Colors.textSecondary, bg: Colors.background, min: 4.5 },
  { label: '補助文字 / カード', fg: Colors.textSecondary, bg: Colors.surface, min: 4.5 },
  { label: '白文字 / アクセント（ヘッダー・主ボタン）', fg: Colors.onPrimary, bg: Colors.primary, min: 4.5 },
  { label: '白文字 / 補助文字色（無効ボタン）', fg: Colors.onPrimary, bg: Colors.textSecondary, min: 4.5 },
  { label: 'アクセント文字 / カード', fg: Colors.primary, bg: Colors.surface, min: 4.5 },
  { label: 'アクセント文字 / 地', fg: Colors.primary, bg: Colors.background, min: 4.5 },
  { label: '危険 / カード', fg: Colors.danger, bg: Colors.surface, min: 4.5 },
  { label: '危険 / 地', fg: Colors.danger, bg: Colors.background, min: 4.5 },
] as const;
