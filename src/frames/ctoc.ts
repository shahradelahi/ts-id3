import { ID3TextEncoding } from '../constants';
import type { ID3TableOfContents, ID3Tag } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseCtocFrame(
  data: Uint8Array,
  subTagParser?: (subBuffer: Uint8Array) => ID3Tag
): ID3TableOfContents | null {
  if (data.length < 3) {
    return null;
  }

  const idRes = readNullTerminatedString(data, 0, ID3TextEncoding.ISO_8859_1);
  const elementID = idRes.value;
  let offset = idRes.nextOffset;

  if (offset + 2 > data.length) {
    return null;
  }

  const flags = data[offset++] ?? 0;
  const isOrdered = (flags & 0x01) === 0x01;
  const entryCount = data[offset++] ?? 0;

  const elements: string[] = [];
  for (let i = 0; i < entryCount; i++) {
    if (offset >= data.length) {
      break;
    }
    const elRes = readNullTerminatedString(data, offset, ID3TextEncoding.ISO_8859_1);
    elements.push(elRes.value);
    offset = elRes.nextOffset;
  }

  let tags: ID3Tag | undefined;
  if (offset < data.length && subTagParser) {
    const subBuffer = data.subarray(offset);
    tags = subTagParser(subBuffer);
  }

  return {
    elementID,
    isOrdered,
    elements,
    ...(tags ? { tags } : {}),
  };
}

export function buildCtocFrame(
  ctoc: ID3TableOfContents,
  isTopLevel = false,
  subTagBuilder?: (tags: ID3Tag) => Uint8Array
): Uint8Array {
  const idBytes = encodeText(ctoc.elementID || '', ID3TextEncoding.ISO_8859_1);
  let flags = 0;
  if (ctoc.isOrdered) {
    flags |= 0x01;
  }
  if (isTopLevel) {
    flags |= 0x02;
  }

  const elemBuffers: Uint8Array[] = [];
  let elemsLen = 0;

  for (const el of ctoc.elements || []) {
    const b = encodeText(el, ID3TextEncoding.ISO_8859_1);
    elemBuffers.push(b);
    elemsLen += b.length + 1; // including null terminator
  }

  const subTagBytes = ctoc.tags && subTagBuilder ? subTagBuilder(ctoc.tags) : new Uint8Array(0);

  const totalLen = idBytes.length + 1 + 1 + 1 + elemsLen + subTagBytes.length;
  const result = new Uint8Array(totalLen);
  let offset = 0;

  result.set(idBytes, offset);
  offset += idBytes.length;
  result[offset++] = 0;

  result[offset++] = flags;
  result[offset++] = elemBuffers.length & 0xff;

  for (const b of elemBuffers) {
    result.set(b, offset);
    offset += b.length;
    result[offset++] = 0;
  }

  if (subTagBytes.length > 0) {
    result.set(subTagBytes, offset);
  }

  return result;
}
