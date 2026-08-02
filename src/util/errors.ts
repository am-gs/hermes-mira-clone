import { errors } from 'telegram';

export class FloodWaitError extends Error {
  constructor(public seconds: number) {
    super(`FLOOD_WAIT_${seconds}`);
    this.name = 'FloodWaitError';
  }
}

export function parseFloodWait(e: unknown): number | null {
  if (e instanceof errors.FloodWaitError) return e.seconds;
  if (e instanceof errors.MsgIdInvalidError) return 1;
  if (e instanceof errors.ChatAboutNotModifiedError) return 1;
  if (e instanceof Error && /FLOOD_WAIT_(\d+)/.test(e.message)) {
    return Number(RegExp.$1);
  }
  return null;
}

export function isRetryable(e: unknown): boolean {
  if (parseFloodWait(e) !== null) return true;
  if (e instanceof errors.NetworkError) return true;
  if (e instanceof errors.TimeoutError) return true;
  if (e instanceof errors.ServerError) return true;
  return false;
}

export function isFatal(e: unknown): boolean {
  if (e instanceof errors.AuthKeyError) return true;
  if (e instanceof errors.UserDeactivatedError) return true;
  if (e instanceof errors.ChatWriteForbiddenError) return true;
  if (e instanceof errors.BotBlockedError) return true;
  return false;
}
