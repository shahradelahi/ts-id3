import { ID3TextEncoding } from '../constants';
import { decodeText, encodeText } from '../utils/encoding';

export function parseTextFrame(data: Uint8Array): string {
  if (data.length === 0) {
    return '';
  }

  const encoding = data[0] as ID3TextEncoding;
  const content = data.subarray(1);
  return decodeText(content, encoding);
}

export function buildTextFrame(
  text: string,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const encodedText = encodeText(text, encoding);
  const result = new Uint8Array(1 + encodedText.length);
  result[0] = encoding;
  result.set(encodedText, 1);
  return result;
}
