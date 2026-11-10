import { ID3TextEncoding } from '../constants';
import type { ID3Comment } from '../typings';
import { decodeText, encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseCommFrame(data: Uint8Array): ID3Comment | null {
  if (data.length < 4) {
    return null;
  }

  const encoding = data[0] as ID3TextEncoding;
  const languageBytes = data.subarray(1, 4);
  const language = String.fromCharCode(...languageBytes);

  let offset = 4;
  const descRes = readNullTerminatedString(data, offset, encoding);
  const shortDescription = descRes.value;
  offset = descRes.nextOffset;

  const textBytes = data.subarray(offset);
  const text = decodeText(textBytes, encoding);

  return {
    language,
    shortDescription,
    text,
  };
}

export function buildCommFrame(
  comment: ID3Comment | string,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const commObj: ID3Comment =
    typeof comment === 'string'
      ? { language: 'eng', shortDescription: '', text: comment }
      : {
          language: comment.language || 'eng',
          shortDescription: comment.shortDescription || '',
          text: comment.text,
        };

  const langStr = (commObj.language + 'eng').slice(0, 3);
  const langBytes = new Uint8Array([
    langStr.charCodeAt(0),
    langStr.charCodeAt(1),
    langStr.charCodeAt(2),
  ]);

  const descBytes = encodeText(commObj.shortDescription || '', encoding);
  const textBytes = encodeText(commObj.text || '', encoding);

  const nullLen =
    encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE ? 2 : 1;
  const totalLength = 1 + 3 + descBytes.length + nullLen + textBytes.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;

  result[offset++] = encoding;

  result.set(langBytes, offset);
  offset += 3;

  result.set(descBytes, offset);
  offset += descBytes.length;

  result[offset++] = 0;
  if (nullLen === 2) {
    result[offset++] = 0;
  }

  result.set(textBytes, offset);

  return result;
}
