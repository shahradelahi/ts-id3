import { ID3TextEncoding } from '../constants';
import type { ID3UserDefinedUrl } from '../typings';
import { decodeText, encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseWxxxFrame(data: Uint8Array): ID3UserDefinedUrl | null {
  if (data.length < 2) {
    return null;
  }

  const encoding = data[0] as ID3TextEncoding;
  const descRes = readNullTerminatedString(data, 1, encoding);
  const description = descRes.value;
  const urlBytes = data.subarray(descRes.nextOffset);
  const url = decodeText(urlBytes, ID3TextEncoding.ISO_8859_1);

  return { description, url };
}

export function buildWxxxFrame(
  wxxx: ID3UserDefinedUrl,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const descBytes = encodeText(wxxx.description || '', encoding);
  const urlBytes = encodeText(wxxx.url || '', ID3TextEncoding.ISO_8859_1);
  const nullLen =
    encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE ? 2 : 1;

  const result = new Uint8Array(1 + descBytes.length + nullLen + urlBytes.length);
  let offset = 0;

  result[offset++] = encoding;

  result.set(descBytes, offset);
  offset += descBytes.length;

  result[offset++] = 0;
  if (nullLen === 2) {
    result[offset++] = 0;
  }

  result.set(urlBytes, offset);

  return result;
}
