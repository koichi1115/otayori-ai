jest.mock('../src/db/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../src/services/reminder', () => ({ registerReminder: jest.fn(() => Promise.resolve()) }));
jest.mock('../src/services/line-notify', () => ({ sendLineNotification: jest.fn(() => Promise.resolve()) }));

import { saveAnalysisResult, notifyAfterSave } from '../src/services/document-import';
import { getDatabase } from '../src/db/database';
import { registerReminder } from '../src/services/reminder';
import { sendLineNotification } from '../src/services/line-notify';

const analysis: any = {
  title: '6月園だより', source: 'さくら保育園', category: 'action_required', summary: 's', suggestedFileName: 'x.pdf',
  events: [{ title: '遠足', date: '2026-10-01', targetPerson: '太郎', description: 'd' }],
  todos: [{ title: '提出', dueDate: '2026-10-02', targetPerson: '太郎', description: 'd' }],
  items: [{ name: 'タオル', targetPerson: '太郎', description: 'd' }],
};

describe('saveAnalysisResult', () => {
  it('documents / events / todos / items を保存し docId を返す', async () => {
    const runAsync = jest.fn().mockResolvedValueOnce({ lastInsertRowId: 42 }).mockResolvedValue({ lastInsertRowId: 0 });
    (getDatabase as jest.Mock).mockResolvedValue({ runAsync });
    const id = await saveAnalysisResult({ analysis, fileName: 'orig.pdf', uri: 'file:///app/orig.pdf' });
    expect(id).toBe(42);
    expect(runAsync).toHaveBeenCalledTimes(4);
    expect(runAsync.mock.calls[0][1]).toEqual(['x.pdf', 'orig.pdf', 'file:///app/orig.pdf', null, 'action_required', 'さくら保育園', '6月園だより', 's', JSON.stringify(analysis)]);
    expect(runAsync.mock.calls[1][1][0]).toBe(42);
  });
});

describe('notifyAfterSave', () => {
  it('期限つき TODO のみリマインダー登録し、LINE 通知を送る', () => {
    notifyAfterSave(analysis);
    expect(registerReminder).toHaveBeenCalledTimes(1); // 持ち物は dueDate 無し
    expect(sendLineNotification).toHaveBeenCalledWith(analysis);
  });
});
