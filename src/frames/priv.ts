import { ID3TextEncoding } from '../constants';
import type { ID3Private } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parsePrivFrame(data: Uint8Array): ID3Private | null {
  if (data.length === 0) {
    return null;
  }

  const ownerRes = readNullTerminatedString(data, 0, ID3TextEncoding.ISO_8859_1);
  const ownerIdentifier = ownerRes.value;
  const privData = data.subarray(ownerRes.nextOffset);

  return { ownerIdentifier, data: privData };
}

export function buildPrivFrame(priv: ID3Private): Uint8Array {
  const ownerBytes = encodeText(priv.ownerIdentifier || '', ID3TextEncoding.ISO_8859_1);
  const payload = priv.data || new Uint8Array(0);

  const result = new Uint8Array(ownerBytes.length + 1 + payload.length);
  let offset = 0;

  result.set(ownerBytes, offset);
  offset += ownerBytes.length;
  result[offset++] = 0;

  result.set(payload, offset);

  return result;
}
