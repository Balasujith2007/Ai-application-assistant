import { ext } from '../browser/browser-api';

export type BgRequest =
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'GET_AUTH' }
  | { type: 'EXCHANGE_CODE'; code: string; state: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SET_SETTINGS'; patch: Record<string, unknown> }
  | { type: 'GET_PROFILE'; sessionId?: string; categories?: string }
  | { type: 'GET_CUSTOM_FIELDS' }
  | { type: 'CONFIRM_FIELD'; payload: Record<string, unknown> }
  | { type: 'PATCH_CUSTOM_FIELD'; id: string; payload: Record<string, unknown> }
  | { type: 'DELETE_CUSTOM_FIELD'; id: string }
  | { type: 'GET_MAPPINGS' }
  | { type: 'SAVE_MAPPING'; payload: Record<string, unknown> }
  | { type: 'MAP_FIELDS'; fields: unknown[]; siteHost: string }
  | { type: 'REPORT_SESSION'; payload: Record<string, unknown> }
  | { type: 'REPORT_AUDIT'; payload: Record<string, unknown> }
  | { type: 'DOWNLOAD_RESUME'; downloadUrl?: string }
  | { type: 'UPLOAD_RESUME'; fileName: string; mimeType?: string; base64: string };

export async function bg<T = unknown>(message: BgRequest): Promise<T> {
  return ext.runtime.sendMessage<T>(message);
}
