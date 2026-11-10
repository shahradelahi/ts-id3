import { ID3TextEncoding } from '../constants';
import type { ID3UserDefinedText } from '../typings';
import { decodeText, encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseTxxxFrame(data: Uint8Array): ID3UserDefinedText | null {
  if (data.length < 2) {
    return null;
  }

  const encoding = data[0] as ID3TextEncoding;
  let offset = 1;

  const descRes = readNullTerminatedString(data, offset, encoding);
  const description = descRes.value;
  offset = descRes.nextOffset;

  const valueBytes = data.subarray(offset);
  const value = decodeText(valueBytes, encoding);

  return {
    description,
    value,
  };
}

export function buildTxxxFrame(
  item: ID3UserDefinedText,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const descBytes = encodeText(item.description || '', encoding);
  const valueBytes = encodeText(item.value || '', encoding);

  const nullLen =
    encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE ? 2 : 1;
  const totalLength = 1 + descBytes.length + nullLen + valueBytes.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;

  result[offset++] = encoding;

  result.set(descBytes, offset);
  offset += descBytes.length;

  result[offset++] = 0;
  if (nullLen === 2) {
    result[offset++] = 0;
  }

  result.set(valueBytes, offset);

  return result;
}
