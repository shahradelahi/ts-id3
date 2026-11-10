import { ID3TextEncoding } from '../constants';

export function decodeText(bytes: Uint8Array, encoding: ID3TextEncoding): string {
  if (bytes.length === 0) {
    return '';
  }

  let label = 'utf-8';
  if (encoding === ID3TextEncoding.ISO_8859_1) {
    label = 'iso-8859-1';
  } else if (encoding === ID3TextEncoding.UTF_16) {
    label = 'utf-16';
  } else if (encoding === ID3TextEncoding.UTF_16BE) {
    label = 'utf-16be';
  } else if (encoding === ID3TextEncoding.UTF_8) {
    label = 'utf-8';
  }

  try {
    const decoder = new TextDecoder(label);
    const text = decoder.decode(bytes);
    return text.replace(/\0+$/, '');
  } catch {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes).replace(/\0+$/, '');
  }
}

export function encodeText(
  text: string,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  if (encoding === ID3TextEncoding.UTF_8) {
    const encoder = new TextEncoder();
    return encoder.encode(text);
  }

  if (encoding === ID3TextEncoding.ISO_8859_1) {
    const result = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      result[i] = text.charCodeAt(i) & 0xff;
    }
    return result;
  }

  if (encoding === ID3TextEncoding.UTF_16) {
    const result = new Uint8Array(2 + text.length * 2);
    result[0] = 0xff;
    result[1] = 0xfe;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      result[2 + i * 2] = code & 0xff;
      result[2 + i * 2 + 1] = (code >> 8) & 0xff;
    }
    return result;
  }

  const encoder = new TextEncoder();
  return encoder.encode(text);
}

export function readNullTerminatedString(
  bytes: Uint8Array,
  offset: number,
  encoding: ID3TextEncoding
): { value: string; nextOffset: number } {
  const isWide = encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE;
  let end = offset;

  if (isWide) {
    while (end < bytes.length - 1) {
      if (bytes[end] === 0 && bytes[end + 1] === 0) {
        break;
      }
      end += 2;
    }
    const strBytes = bytes.subarray(offset, end);
    const value = decodeText(strBytes, encoding);
    const nextOffset = end < bytes.length ? end + 2 : bytes.length;
    return { value, nextOffset };
  }

  while (end < bytes.length) {
    if (bytes[end] === 0) {
      break;
    }
    end += 1;
  }
  const strBytes = bytes.subarray(offset, end);
  const value = decodeText(strBytes, encoding);
  const nextOffset = end < bytes.length ? end + 1 : bytes.length;
  return { value, nextOffset };
}
