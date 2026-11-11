import { ID3TextEncoding } from '../constants';
import type { ID3GeneralEncapsulatedObject } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseGeobFrame(data: Uint8Array): ID3GeneralEncapsulatedObject | null {
  if (data.length < 4) {
    return null;
  }

  const encoding = data[0] as ID3TextEncoding;
  let offset = 1;

  const mimeRes = readNullTerminatedString(data, offset, ID3TextEncoding.ISO_8859_1);
  const mimeType = mimeRes.value;
  offset = mimeRes.nextOffset;

  const fnRes = readNullTerminatedString(data, offset, encoding);
  const filename = fnRes.value;
  offset = fnRes.nextOffset;

  const descRes = readNullTerminatedString(data, offset, encoding);
  const contentDescription = descRes.value;
  offset = descRes.nextOffset;

  const encapsulatedObject = data.subarray(offset);

  return {
    mimeType,
    filename,
    contentDescription,
    encapsulatedObject,
  };
}

export function buildGeobFrame(
  geob: ID3GeneralEncapsulatedObject,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const mimeBytes = encodeText(geob.mimeType || '', ID3TextEncoding.ISO_8859_1);
  const fnBytes = encodeText(geob.filename || '', encoding);
  const descBytes = encodeText(geob.contentDescription || '', encoding);
  const objBytes = geob.encapsulatedObject || new Uint8Array(0);

  const nullLen =
    encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE ? 2 : 1;

  const totalLen =
    1 + // encoding
    mimeBytes.length +
    1 + // null
    fnBytes.length +
    nullLen +
    descBytes.length +
    nullLen +
    objBytes.length;

  const result = new Uint8Array(totalLen);
  let offset = 0;

  result[offset++] = encoding;

  result.set(mimeBytes, offset);
  offset += mimeBytes.length;
  result[offset++] = 0;

  result.set(fnBytes, offset);
  offset += fnBytes.length;
  result[offset++] = 0;
  if (nullLen === 2) {
    result[offset++] = 0;
  }

  result.set(descBytes, offset);
  offset += descBytes.length;
  result[offset++] = 0;
  if (nullLen === 2) {
    result[offset++] = 0;
  }

  result.set(objBytes, offset);

  return result;
}
