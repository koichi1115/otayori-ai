// react-test-renderer は型定義を同梱しないため、テストで使う最小限だけ宣言する（@types 追加を避ける）。
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';
  export function act(callback: () => void | Promise<void>): Promise<void> & void;
  const TestRenderer: {
    create(element: ReactElement): { update(element: ReactElement): void; unmount(): void };
  };
  export default TestRenderer;
}
