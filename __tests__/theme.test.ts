import {
  Colors,
  ContrastPairs,
  BorderRadius,
  BorderWidth,
  FontSize,
  FontWeight,
  LineHeight,
  Shadows,
  Spacing,
  TouchTarget,
  Type,
  contrastRatio,
  hitSlopFor,
} from '../src/constants/theme';

// 禁止色: 文字色・白文字の背景には使わない（コントラスト計算済み）
const FORBIDDEN_TEXT_OR_BG = ['#4A90D9', '#8E8E93', '#FF9500', '#FF3B30', '#FFCC00', '#06C755'];

describe('contrastRatio', () => {
  it('白と黒は 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });
  it('順序に依らない', () => {
    expect(contrastRatio('#2F6DB0', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#2F6DB0'), 5);
  });
  it('既知値: 白 on #2F6DB0 は約5.3、白 on #4A90D9 は約3.3', () => {
    expect(contrastRatio('#FFFFFF', '#2F6DB0')).toBeCloseTo(5.34, 1);
    expect(contrastRatio('#FFFFFF', '#4A90D9')).toBeCloseTo(3.34, 1);
  });
});

describe('色トークン（設計承認済みの値）', () => {
  it('基本色', () => {
    expect(Colors.background).toBe('#F5F5F5');
    expect(Colors.surface).toBe('#FFFFFF');
    expect(Colors.text).toBe('#1C1C1E');
    expect(Colors.border).toBe('#E5E5EA');
  });
  it('アクセントは青1色 #2F6DB0、白文字は onPrimary', () => {
    expect(Colors.primary).toBe('#2F6DB0');
    expect(Colors.onPrimary).toBe('#FFFFFF');
  });
  it('補助文字は #636366、危険色は #D70015', () => {
    expect(Colors.textSecondary).toBe('#636366');
    expect(Colors.danger).toBe('#D70015');
  });
  it('オレンジ等の多色トークンが残っていない', () => {
    const c = Colors as Record<string, unknown>;
    ['secondary', 'warning', 'success', 'notice', 'actionRequired', 'primaryLight'].forEach((k) => {
      expect(c[k]).toBeUndefined();
    });
  });
  it('禁止色が文字色・背景トークンに使われていない', () => {
    const values = Object.values(Colors).map((v) => String(v).toUpperCase());
    FORBIDDEN_TEXT_OR_BG.forEach((bad) => expect(values).not.toContain(bad));
  });
  it('緑 #34C759 は点（statusDot）専用', () => {
    const holders = Object.entries(Colors).filter(([, v]) => String(v).toUpperCase() === '#34C759');
    expect(holders.map(([k]) => k)).toEqual(['statusDot']);
  });
});

describe('コントラスト比（テキスト 4.5 以上）', () => {
  it('ContrastPairs が空でない', () => {
    expect(ContrastPairs.length).toBeGreaterThanOrEqual(8);
  });
  it.each(ContrastPairs.map((p) => [p.label, p.fg, p.bg, p.min] as const))(
    '%s (%s on %s) >= %s',
    (_label, fg, bg, min) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
    }
  );
  it('白文字の背景 #2F6DB0 は 5.3 以上', () => {
    expect(contrastRatio(Colors.onPrimary, Colors.primary)).toBeGreaterThanOrEqual(5.3);
  });
  it('補助文字は背景・カード白のどちらでも 4.5 以上（5.4 以上）', () => {
    expect(contrastRatio(Colors.textSecondary, Colors.background)).toBeGreaterThanOrEqual(5.4);
    expect(contrastRatio(Colors.textSecondary, Colors.surface)).toBeGreaterThanOrEqual(5.4);
  });
  it('危険色は白カード上で 4.5 以上', () => {
    expect(contrastRatio(Colors.danger, Colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it('バッジ文字（要対応=アクセント、お知らせ=補助文字）が背景・カードの両方で 4.5 以上', () => {
    [Colors.background, Colors.surface].forEach((bg) => {
      expect(contrastRatio(Colors.primary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(Colors.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('タップ領域', () => {
  it('最小値は 48', () => {
    expect(TouchTarget.min).toBe(48);
  });
  it('hitSlopFor: 22x22 のアイコンは各辺 13 広げて 48 になる', () => {
    expect(hitSlopFor(22, 22)).toEqual({ top: 13, bottom: 13, left: 13, right: 13 });
  });
  it('hitSlopFor: 既に 48 以上なら 0', () => {
    expect(hitSlopFor(60, 48)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
  it('hitSlopFor: 奇数の不足分は合計で 48 に届く', () => {
    const s = hitSlopFor(21, 21);
    expect(21 + s.left + s.right).toBeGreaterThanOrEqual(48);
    expect(21 + s.top + s.bottom).toBeGreaterThanOrEqual(48);
  });
});

describe('タイポグラフィ', () => {
  it('本文 15px・太さ 400、見出し太さ 700（900 は不可）', () => {
    expect(FontSize.md).toBe(15);
    expect(FontWeight.body).toBe('400');
    expect(FontWeight.heading).toBe('700');
    Object.values(FontWeight).forEach((w) => expect(['800', '900', 'bold']).not.toContain(w));
  });
  it('行間 1.55 倍（本文 15px → 23）', () => {
    expect(LineHeight(15)).toBe(23);
    expect(Type.body).toEqual({ fontSize: 15, fontWeight: '400', lineHeight: 23 });
  });
  it('Type: 本文系は行間 1.55 倍、見出し(700)は 1.55 倍以下', () => {
    Object.values(Type).forEach((t) => {
      if (t.fontWeight === FontWeight.heading) {
        expect(t.lineHeight / t.fontSize).toBeLessThanOrEqual(1.55);
        expect(t.lineHeight / t.fontSize).toBeGreaterThanOrEqual(1.1);
      } else {
        expect(t.lineHeight).toBe(LineHeight(t.fontSize));
      }
    });
  });
  it('見出しプリセットの太さは 700', () => {
    [Type.sectionTitle, Type.title, Type.display].forEach((t) => expect(t.fontWeight).toBe('700'));
  });
});

describe('角丸・影・余白', () => {
  it('角丸 7 を基準にする', () => {
    expect(BorderRadius.md).toBe(7);
    expect(BorderRadius.sm).toBeLessThan(BorderRadius.md);
    expect(BorderRadius.lg).toBeGreaterThan(BorderRadius.md);
  });
  it('影は弱い（不透明度 0.1 以下）', () => {
    expect(Shadows.card.shadowOpacity).toBeLessThanOrEqual(0.1);
    expect(Shadows.raised.shadowOpacity).toBeLessThanOrEqual(0.1);
  });
  it('罫線幅の定義', () => {
    expect(BorderWidth.none).toBe(0);
    expect(BorderWidth.thin).toBe(1);
  });
  it('余白は今のまま（基準 1.0）', () => {
    expect(Spacing).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32 });
  });
});
