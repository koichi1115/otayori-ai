// FileStore の実装（expo-file-system）。共有された一時ファイルを、アプリの Documents 配下へコピーする。
import { Directory, File, Paths } from 'expo-file-system';
import type { FileStore } from './types';

const INBOX_DIR = 'shared-inbox';

function safeName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(-80) || 'shared';
}

function uniqueName(fileName: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(fileName)}`;
}

export const fileStore: FileStore = {
  async copyToAppStorage(sourceUri, fileName) {
    const inbox = new Directory(Paths.document, INBOX_DIR);
    inbox.create({ intermediates: true, idempotent: true });
    const destination = new File(inbox, uniqueName(fileName));
    new File(sourceUri).copy(destination);
    return { uri: destination.uri, size: destination.size };
  },
  async readBytes(uri) {
    return new File(uri).bytes();
  },
  async remove(uri) {
    const file = new File(uri);
    if (file.exists) file.delete();
  },
};
