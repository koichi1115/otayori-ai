jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
import { router } from 'expo-router';
import { showResult, showCamera, showHome } from '../../src/share/share-navigation';

beforeEach(() => jest.clearAllMocks());

describe('share-navigation', () => {
  it('結果表示: ホームを土台に置いてから解析結果へ（戻る先を作る）', () => {
    showResult(12);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/analysis-result', params: { docId: '12' } });
  });
  it('カメラ: ホームを土台にしてスキャン画面へ', () => {
    showCamera();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    expect(router.push).toHaveBeenCalledWith('/camera-scan');
  });
  it('ホームへ戻る', () => {
    showHome();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    expect(router.push).not.toHaveBeenCalled();
  });
});
