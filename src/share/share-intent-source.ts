// expo-share-intent の読み込み口。ネイティブ拡張が無い環境（Expo Go・jest）では何もしない実装に差し替える。
import React from 'react';

interface ShareIntentValue {
  hasShareIntent: boolean;
  shareIntent: unknown;
  error: string | null;
  resetShareIntent: () => void;
}

const NONE: ShareIntentValue = { hasShareIntent: false, shareIntent: null, error: null, resetShareIntent: () => {} };

let Provider: React.ComponentType<{ children?: React.ReactNode }> = ({ children }) => React.createElement(React.Fragment, null, children);
let useValue: () => ShareIntentValue = () => NONE;

try {
  const lib = require('expo-share-intent');
  Provider = lib.ShareIntentProvider;
  useValue = lib.useShareIntentContext;
} catch {
  /* ネイティブモジュール不在 */
}

export const ShareIntentRoot = Provider;
export const useShareIntentValue = useValue;
