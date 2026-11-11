import { ID3TextEncoding } from '../constants';
import type { ID3Chapter, ID3Tag } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseChapFrame(
  data: Uint8Array,
  subTagParser?: (subBuffer: Uint8Array) => ID3Tag
): ID3Chapter | null {
  if (data.length < 17) {
    return null;
  }

  const idRes = readNullTerminatedString(data, 0, ID3TextEncoding.ISO_8859_1);
  const elementID = idRes.value;
  let offset = idRes.nextOffset;

  if (offset + 16 > data.length) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset + offset, 16);
  const startTimeMs = view.getUint32(0, false);
  const endTimeMs = view.getUint32(4, false);
  const startOffsetRaw = view.getUint32(8, false);
  const endOffsetRaw = view.getUint32(12, false);
  offset += 16;

  const startOffsetBytes = startOffsetRaw === 0xffffffff ? undefined : startOffsetRaw;
  const endOffsetBytes = endOffsetRaw === 0xffffffff ? undefined : endOffsetRaw;

  let tags: ID3Tag | undefined;
  if (offset < data.length && subTagParser) {
    const subBuffer = data.subarray(offset);
    tags = subTagParser(subBuffer);
  }

  return {
    elementID,
    startTimeMs,
    endTimeMs,
    ...(startOffsetBytes !== undefined ? { startOffsetBytes } : {}),
    ...(endOffsetBytes !== undefined ? { endOffsetBytes } : {}),
    ...(tags ? { tags } : {}),
  };
}

export function buildChapFrame(
  chap: ID3Chapter,
  subTagBuilder?: (tags: ID3Tag) => Uint8Array
): Uint8Array {
  const idBytes = encodeText(chap.elementID || '', ID3TextEncoding.ISO_8859_1);
  const startOff = chap.startOffsetBytes ?? 0xffffffff;
  const endOff = chap.endOffsetBytes ?? 0xffffffff;

  const subTagBytes = chap.tags && subTagBuilder ? subTagBuilder(chap.tags) : new Uint8Array(0);

  const totalLen = idBytes.length + 1 + 16 + subTagBytes.length;
  const result = new Uint8Array(totalLen);
  let offset = 0;

  result.set(idBytes, offset);
  offset += idBytes.length;
  result[offset++] = 0;

  const view = new DataView(result.buffer, result.byteOffset + offset, 16);
  view.setUint32(0, chap.startTimeMs || 0, false);
  view.setUint32(4, chap.endTimeMs || 0, false);
  view.setUint32(8, startOff, false);
  view.setUint32(12, endOff, false);
  offset += 16;

  if (subTagBytes.length > 0) {
    result.set(subTagBytes, offset);
  }

  return result;
}
