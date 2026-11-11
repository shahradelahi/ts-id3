import { ID3TextEncoding } from '../constants';
import { decodeText, encodeText } from '../utils/encoding';

export function parseUrlFrame(data: Uint8Array): string {
  if (data.length === 0) {
    return '';
  }
  return decodeText(data, ID3TextEncoding.ISO_8859_1);
}

export function buildUrlFrame(url: string): Uint8Array {
  return encodeText(url, ID3TextEncoding.ISO_8859_1);
}
