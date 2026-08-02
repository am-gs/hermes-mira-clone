import { randomBytes } from 'crypto';

export function randomLong(): bigint {
  const bytes = randomBytes(8);
  return BigInt('0x' + bytes.toString('hex'));
}

export function randomString(length: number = 16): string {
  return randomBytes(length).toString('hex').slice(0, length);
}
