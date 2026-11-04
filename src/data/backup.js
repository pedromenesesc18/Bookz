import { normalizeBook } from '../domain/book.js';
import { todayISO } from '../lib/dates.js';

export const BACKUP_VERSION = 2;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export class BackupError extends Error {}

export const serializeBackup = (books, now = new Date()) =>
  JSON.stringify(
    { app: 'bookz', version: BACKUP_VERSION, exportedAt: now.toISOString(), books },
    null,
    2,
  );

export const backupFileName = (now = new Date()) => `bookz-backup-${todayISO(now)}.json`;

/** Accepts v1/v2 envelopes or a bare array. Invalid entries are skipped. */
export const parseBackup = (text) => {
  if (text.length > MAX_BACKUP_BYTES) throw new BackupError('Arquivo muito grande');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('Arquivo de backup inválido');
  }
  const list = Array.isArray(data) ? data : data?.books;
  if (!Array.isArray(list)) throw new BackupError('Arquivo de backup inválido');
  return list.map(normalizeBook).filter(Boolean);
};
