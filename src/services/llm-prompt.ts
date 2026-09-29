import type { Child, Facility } from '../types';

export function buildPrompt(children: Child[], facilities: Facility[]): string {
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();

  // 施設IDから施設名へのマッピング
  const facilityMap = new Map(facilities.map(f => [f.id, f]));

  let childrenInfo = '';
  children.forEach((child, i) => {
    const genderStr = child.gender === 'male' ? '男性' : '女性';
    const facility = facilityMap.get(child.facilityId);
    const facilityStr = facility ? `所属: ${facility.name}` : '所属施設なし';
    childrenInfo += `${i + 1}人目: ${child.name} ${genderStr} ${child.birthdate}生まれ`;
    if (child.className) childrenInfo += ` (${child.className})`;
    childrenInfo += ` [${facilityStr}]`;
    childrenInfo += '\n';
  });

  let facilitiesInfo = '';
  facilities.forEach((f) => {
    const typeStr = f.type === 'nursery' ? '保育園' : f.type === 'school' ? '学校' : '習い事';
    const enrolledChildren = children.filter(c => c.facilityId === f.id).map(c => c.name);
    facilitiesInfo += `- ${f.name} (${typeStr})`;
    if (enrolledChildren.length > 0) facilitiesInfo += ` → 在籍: ${enrolledChildren.join(', ')}`;
    if (f.address) facilitiesInfo += ` 所在地: ${f.address}`;
    if (f.notes) facilitiesInfo += `\n  ${f.notes}`;
    facilitiesInfo += '\n';
  });

  const childNames = children.map(c => `"${c.name}"`).join(' or ');

  return `#指示
以下のPDF資料を分析し、JSONのみを出力してください。

## 前提知識
今日の日付: ${today}
年が記載されていない日付は${year}年として解釈してください。

### 子供の情報
${childrenInfo || '(未登録)'}

### 施設の情報
${facilitiesInfo || '(未登録)'}

## 出力フォーマット
必ず以下のJSON形式のみを出力してください。説明文やマークダウン記法は含めないでください:

{
  "title": "ドキュメントのタイトル（例: ○○保育園 6月園だより）",
  "source": "発行元の施設名",
  "category": "notice または action_required（TODOや持ち物、提出物がある場合はaction_required）",
  "summary": "要約内容（500文字程度、箇条書き形式、*は使わず・や-を使用）",
  "suggestedFileName": "推奨ファイル名（例: 2025-06_○○保育園_6月園だより.pdf）",
  "events": [
    {
      "title": "イベント名",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "location": "場所",
      "targetPerson": "対象の子供の名前",
      "description": "詳細"
    }
  ],
  "todos": [
    {
      "title": "TODO内容",
      "dueDate": "YYYY-MM-DD",
      "targetPerson": "対象の子供の名前",
      "description": "詳細"
    }
  ],
  "items": [
    {
      "name": "持ち物名",
      "dueDate": "YYYY-MM-DD",
      "targetPerson": "対象の子供の名前",
      "description": "詳細"
    }
  ]
}

## ルール
1. 5ページ以上のPDFは対象外
2. ハルシネーションしないこと。判断がつかない場合はsummaryにその旨を記載
3. 日付はYYYY-MM-DD、時刻はHH:MM（24時間表記）
4. targetPersonは必ず ${childNames || '"子供の名前"'} で記載
5. events, todos, itemsは該当がなければ空配列[]
6. categoryは、TODOや持ち物、提出物、準備が必要なものが1つでもあれば "action_required"、なければ "notice"
7. suggestedFileNameはYYYY-MM_発行元_タイトル.pdf の形式
8. **重要: targetPersonは、プリントの発行元施設に在籍している子供のみを対象にすること。** 例えば保育園のプリントなら保育園に在籍している子供だけ、小学校のプリントなら小学校に在籍している子供だけをtargetPersonにする。他の施設に在籍している子供にTODOやイベントを割り当てないこと。
9. **クラス区分による対象判定:** プリントに「乳児組」「幼児組」「○年生」などのクラス区分が記載されている場合、子供の年齢・クラス名・施設の備考欄を照合して、該当する子供のみをtargetPersonにすること。例: 備考に「乳児組（0歳〜2歳）」とある施設の場合、プリントに「幼児組対象」と書かれていれば、その子供は対象外。逆に「乳児組対象」なら対象。プリント全体が対象（クラス区分なし）の場合はその施設に在籍する全員を対象にする。`;
}
