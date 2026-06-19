import { getSetting } from '../db/settings';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function getAccessToken(): Promise<string> {
  const token = await getSetting('googleAccessToken');
  if (!token) throw new Error('Googleアカウントと連携してください。設定画面から認証できます。');
  return token;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  webViewLink: string;
}

/**
 * List files in a specific folder
 */
export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const token = await getAccessToken();
  const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType contains 'image/')`;
  const response = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime,webViewLink)&orderBy=createdTime desc&pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) throw new Error('Google認証が期限切れです。再認証してください。');
    throw new Error(`Google Drive APIエラー (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Download file content as base64
 */
export async function downloadFileAsBase64(fileId: string): Promise<{ base64: string; mimeType: string }> {
  const token = await getAccessToken();

  // First get file metadata
  const metaRes = await fetch(`${DRIVE_API}/files/${fileId}?fields=mimeType,name`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) throw new Error('ファイル情報の取得に失敗しました');
  const meta = await metaRes.json();

  // Download content
  const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('ファイルのダウンロードに失敗しました');

  const blob = await response.blob();
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return { base64, mimeType: meta.mimeType };
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFile(
  folderId: string,
  fileName: string,
  base64Content: string,
  mimeType: string = 'application/pdf'
): Promise<DriveFile> {
  const token = await getAccessToken();

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  // Convert base64 to blob
  const byteCharacters = atob(base64Content);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // Multipart upload
  const boundary = 'otayori_ai_boundary';
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${base64Content}\r\n` +
    `--${boundary}--`;

  const response = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,createdTime,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ファイルのアップロードに失敗しました (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Rename a file on Google Drive
 */
export async function renameFile(fileId: string, newName: string): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!response.ok) {
    throw new Error('ファイル名の変更に失敗しました');
  }
}

/**
 * Get Drive file URL from file ID
 */
export function getDriveFileUrl(fileId: string): string {
  return `https://drive.google.com/open?id=${fileId}`;
}
