/**
 * 画面（app/、App.tsx、src/components）に見た目の直値・禁止パターンが残らないことを検査する。
 * テーマ値は src/constants/theme.ts に集約する（関心の分離）。
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listFiles(p);
    return /\.(tsx?|jsx?)$/.test(e.name) ? [p] : [];
  });
}

// 画面(app/, App.tsx)に加え、画面から使う共通コンポーネント(src/components)も同じ規約に従わせる
const screenFiles = [
  ...listFiles(path.join(ROOT, 'app')),
  ...listFiles(path.join(ROOT, 'src/components')),
  path.join(ROOT, 'App.tsx'),
];
const rel = (f: string) => path.relative(ROOT, f);
const read = (f: string) => fs.readFileSync(f, 'utf8');

/** コメント行を除いたソース */
function code(f: string): string {
  return read(f)
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
}

function violations(pattern: RegExp): string[] {
  const out: string[] = [];
  for (const f of screenFiles) {
    code(f).split('\n').forEach((line, i) => {
      if (pattern.test(line)) out.push(`${rel(f)}:${i + 1}: ${line.trim()}`);
    });
  }
  return out;
}

describe('画面に直値を書かない', () => {
  it('対象ファイルを拾えている', () => {
    expect(screenFiles.length).toBeGreaterThanOrEqual(12);
  });
  it('16進カラーコード・rgba/rgb・色名がない', () => {
    expect(violations(/#[0-9A-Fa-f]{3,8}\b|rgba?\(/)).toEqual([]);
    expect(violations(/(color|Color)\s*[:=]\s*\{?\s*['"](white|black|red|blue|gray|grey)['"]/)).toEqual([]);
    expect(violations(/\bcolor="(white|black)"/)).toEqual([]);
  });
  it('fontSize / fontWeight / lineHeight / borderRadius / borderWidth に数値・文字列の直値がない', () => {
    expect(violations(/\bfontSize\s*:\s*\d/)).toEqual([]);
    expect(violations(/\bfontWeight\s*:\s*['"]/)).toEqual([]);
    expect(violations(/\blineHeight\s*:\s*\d/)).toEqual([]);
    expect(violations(/\bborder(Top|Bottom|Left|Right)?(Start|End)?Radius\s*:\s*\d/)).toEqual([]);
    expect(violations(/\bborderRadius\s*:\s*\d/)).toEqual([]);
    expect(violations(/\bborder(Top|Bottom|Left|Right)?Width\s*:\s*\d/)).toEqual([]);
  });
  it('カード左の色線（stripes）がない', () => {
    expect(violations(/\bborderLeft(Width|Color)\b/)).toEqual([]);
  });
});

describe('廃止したテーマ値を使わない', () => {
  it('Colors.secondary / warning / success / notice / actionRequired / primaryLight を参照しない', () => {
    expect(violations(/Colors\.(secondary|warning|success|notice|actionRequired|primaryLight)\b/)).toEqual([]);
  });
  it('旧 Shadows.sm/md/lg・BorderRadius.xl を参照しない', () => {
    expect(violations(/Shadows\.(sm|md|lg)\b/)).toEqual([]);
    expect(violations(/BorderRadius\.xl\b/)).toEqual([]);
  });
  it('緑の statusDot は背景（点）としてだけ使う', () => {
    const uses = violations(/Colors\.statusDot\b/);
    uses.forEach((u) => expect(u).toMatch(/backgroundColor\s*:\s*Colors\.statusDot/));
  });
});

describe('アイコンは線画（outline）', () => {
  // 線画の別名が無い、または形そのものが線のアイコンだけ例外
  const LINE_SHAPES = new Set([
    'chevron-forward', 'chevron-back', 'add', 'checkmark', 'close', 'search', 'list', 'swap-horizontal',
  ]);
  const glyphs: Record<string, number> = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'),
      'utf8'
    )
  );

  const names = new Set<string>();
  for (const f of screenFiles) {
    const src = code(f);
    for (const m of src.matchAll(/(\.Screen\s+)?name=(?:\{[^}]*\}|"[^"]*")/g)) {
      if (m[1]) continue; // <Stack.Screen name="..."> はルート名。アイコン名ではない
      for (const n of m[0].matchAll(/['"]([a-z0-9-]+)['"]/g)) names.add(n[1]);
    }
    // { icon: 'xxx' } 形式
    for (const m of src.matchAll(/icon\s*:\s*['"]([a-z0-9-]+)['"]/g)) names.add(m[1]);
  }

  it('アイコン名を拾えている', () => {
    expect(names.size).toBeGreaterThan(10);
  });
  it('存在するアイコン名だけを使う', () => {
    [...names].forEach((n) => expect(glyphs[n]).toBeDefined());
  });
  it('塗りつぶし系（-outline の別名があるもの）を使わない', () => {
    const filled = [...names].filter(
      (n) => !n.endsWith('-outline') && !LINE_SHAPES.has(n) && glyphs[`${n}-outline`] !== undefined
    );
    expect(filled).toEqual([]);
  });
});

describe('タップ領域（最小 48）', () => {
  /** styles.foo の定義本文を返す */
  function styleBlock(src: string, key: string): string {
    const m = src.match(new RegExp(`\\n\\s{2}${key}:\\s*\\{([\\s\\S]*?)\\n\\s{2}\\},?|\\n\\s{2}${key}:\\s*\\{([^\\n]*)\\},?`));
    return m ? (m[1] ?? m[2] ?? '') : '';
  }

  it('TouchableOpacity / Pressable は hitSlop か TouchTarget を使う style を持つ', () => {
    const bad: string[] = [];
    for (const f of screenFiles) {
      const src = code(f);
      for (const m of src.matchAll(/<(TouchableOpacity|Pressable)\b([\s\S]*?)(?<!=)>/g)) {
        const tag = m[2];
        if (/hitSlop=/.test(tag)) continue;
        const keys = [...tag.matchAll(/styles\.(\w+)/g)].map((k) => k[1]);
        const ok = keys.some((k) => /TouchTarget|IconButton/.test(styleBlock(src, k)));
        if (!ok) bad.push(`${rel(f)}: <${m[1]} ${tag.replace(/\s+/g, ' ').slice(0, 90)}…`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('「すべて登録」「カレンダーに登録」のボタンは 48 を保証する', () => {
    const src = code(path.join(ROOT, 'app/analysis-result.tsx'));
    ['bulkButton', 'registerChip'].forEach((k) => {
      expect(styleBlock(src, k)).toMatch(/minHeight:\s*TouchTarget\.min/);
    });
  });

  it('画面から TouchTarget を import している', () => {
    expect(read(path.join(ROOT, 'app/analysis-result.tsx'))).toMatch(/TouchTarget/);
  });
});
