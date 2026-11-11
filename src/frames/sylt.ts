import { ID3TextEncoding } from '../constants';
import type { ID3SynchronisedLyrics, ID3SynchronisedLyricsPart } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseSyltFrame(data: Uint8Array): ID3SynchronisedLyrics | null {
  if (data.length < 6) {
    return null;
  }

  const encoding = data[0] as ID3TextEncoding;
  const languageBytes = data.subarray(1, 4);
  const language = String.fromCharCode(...languageBytes);
  const timeStampFormat = data[4] ?? 1;
  const contentType = data[5] ?? 0;

  let offset = 6;
  const descRes = readNullTerminatedString(data, offset, encoding);
  const shortDescription = descRes.value;
  offset = descRes.nextOffset;

  const synchronisedText: ID3SynchronisedLyricsPart[] = [];

  while (offset < data.length) {
    const textRes = readNullTerminatedString(data, offset, encoding);
    const text = textRes.value;
    offset = textRes.nextOffset;

    if (offset + 4 > data.length) {
      break;
    }

    const view = new DataView(data.buffer, data.byteOffset + offset, 4);
    const timeStamp = view.getUint32(0, false);
    offset += 4;

    synchronisedText.push({ text, timeStamp });
  }

  return {
    language,
    timeStampFormat,
    contentType,
    shortDescription,
    synchronisedText,
  };
}

export function buildSyltFrame(
  sylt: ID3SynchronisedLyrics,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const langStr = (sylt.language || 'eng').concat('eng').slice(0, 3);
  const langBytes = encodeText(langStr, ID3TextEncoding.ISO_8859_1);

  const descBytes = encodeText(sylt.shortDescription || '', encoding);
  const nullLen =
    encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE ? 2 : 1;

  const partsBuffers: Uint8Array[] = [];
  let partsTotalLen = 0;

  for (const part of sylt.synchronisedText || []) {
    const pTextBytes = encodeText(part.text || '', encoding);
    const buf = new Uint8Array(pTextBytes.length + nullLen + 4);
    buf.set(pTextBytes, 0);
    let pOff = pTextBytes.length;
    buf[pOff++] = 0;
    if (nullLen === 2) {
      buf[pOff++] = 0;
    }
    const view = new DataView(buf.buffer, buf.byteOffset + pOff, 4);
    view.setUint32(0, part.timeStamp || 0, false);
    partsBuffers.push(buf);
    partsTotalLen += buf.length;
  }

  const headerLen = 1 + 3 + 1 + 1 + descBytes.length + nullLen;
  const result = new Uint8Array(headerLen + partsTotalLen);

  let offset = 0;
  result[offset++] = encoding;

  result.set(langBytes, offset);
  offset += 3;

  result[offset++] = sylt.timeStampFormat ?? 1;
  result[offset++] = sylt.contentType ?? 0;

  result.set(descBytes, offset);
  offset += descBytes.length;
  result[offset++] = 0;
  if (nullLen === 2) {
    result[offset++] = 0;
  }

  for (const pBuf of partsBuffers) {
    result.set(pBuf, offset);
    offset += pBuf.length;
  }

  return result;
}
