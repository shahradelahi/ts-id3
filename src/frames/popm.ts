import { ID3TextEncoding } from '../constants';
import type { ID3Popularimeter } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parsePopmFrame(data: Uint8Array): ID3Popularimeter | null {
  if (data.length === 0) {
    return null;
  }

  const emailRes = readNullTerminatedString(data, 0, ID3TextEncoding.ISO_8859_1);
  const email = emailRes.value;
  let offset = emailRes.nextOffset;

  if (offset >= data.length) {
    return { email, rating: 0, counter: 0 };
  }

  const rating = data[offset++] ?? 0;
  const counterBytes = data.subarray(offset);

  let counter = 0;
  for (let i = 0; i < counterBytes.length; i++) {
    counter = counter * 256 + (counterBytes[i] ?? 0);
  }

  return { email, rating, counter };
}

export function buildPopmFrame(popm: ID3Popularimeter): Uint8Array {
  const emailBytes = encodeText(popm.email || '', ID3TextEncoding.ISO_8859_1);
  const rating = Math.max(0, Math.min(255, Math.floor(popm.rating || 0)));

  const result = new Uint8Array(emailBytes.length + 1 + 1 + 4);
  let offset = 0;

  result.set(emailBytes, offset);
  offset += emailBytes.length;
  result[offset++] = 0; // null terminator for email

  result[offset++] = rating;

  const view = new DataView(result.buffer, result.byteOffset + offset, 4);
  view.setUint32(0, Math.max(0, Math.floor(popm.counter || 0)), false);

  return result;
}
