/**
 * Helper utilities for client-side Google Drive and Gmail API calls
 */

// Helper to base64url encode a string for Gmail API
function base64urlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Searches for a folder by name in Google Drive.
 * Returns the folder ID if found, otherwise null.
 */
export async function findDriveFolder(accessToken: string, folderName: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error finding Drive folder:', errText);
    throw new Error(`Failed to check Google Drive folders: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Creates a folder in Google Drive.
 * Returns the created folder ID.
 */
export async function createDriveFolder(accessToken: string, folderName: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error creating Drive folder:', errText);
    throw new Error(`Failed to create Google Drive folder: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Ensures a folder exists by searching for it, and creating it if not found.
 * Returns the folder ID.
 */
export async function ensureDriveFolder(accessToken: string, folderName: string): Promise<string> {
  const existingId = await findDriveFolder(accessToken, folderName);
  if (existingId) {
    return existingId;
  }
  return await createDriveFolder(accessToken, folderName);
}

/**
 * Uploads a text or JSON file to a specific folder in Google Drive.
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string,
  folderId?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: fileName,
    mimeType: mimeType,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = 'siteguard_upload_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error uploading file to Drive:', errText);
    throw new Error(`Failed to save file to Google Drive: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Sends an email using Gmail API.
 */
export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  bodyHtml: string
): Promise<{ id: string; threadId: string }> {
  // Construct a standard MIME email string
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    bodyHtml,
  ];
  
  const rawEmail = emailLines.join('\r\n');
  const encodedEmail = base64urlEncode(rawEmail);

  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedEmail,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error sending email via Gmail:', errText);
    throw new Error(`Failed to send email via Gmail: ${response.statusText}`);
  }

  return await response.json();
}
