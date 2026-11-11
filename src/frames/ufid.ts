import { ID3TextEncoding } from '../constants';
import type { ID3UniqueFileIdentifier } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseUfidFrame(data: Uint8Array): ID3UniqueFileIdentifier | null {
  if (data.length === 0) {
    return null;
  }

  const ownerRes = readNullTerminatedString(data, 0, ID3TextEncoding.ISO_8859_1);
  const ownerIdentifier = ownerRes.value;
  const identifier = data.subarray(ownerRes.nextOffset);

  return { ownerIdentifier, identifier };
}

export function buildUfidFrame(ufid: ID3UniqueFileIdentifier): Uint8Array {
  const ownerBytes = encodeText(ufid.ownerIdentifier || '', ID3TextEncoding.ISO_8859_1);
  const idBytes =
    typeof ufid.identifier === 'string'
      ? encodeText(ufid.identifier, ID3TextEncoding.ISO_8859_1)
      : ufid.identifier || new Uint8Array(0);

  const result = new Uint8Array(ownerBytes.length + 1 + idBytes.length);
  let offset = 0;

  result.set(ownerBytes, offset);
  offset += ownerBytes.length;
  result[offset++] = 0;

  result.set(idBytes, offset);

  return result;
}
