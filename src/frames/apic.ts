import { ID3PictureType, ID3TextEncoding } from '../constants';
import type { ID3Picture } from '../typings';
import { encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseApicFrame(data: Uint8Array, isV2_2 = false): ID3Picture | null {
  if (data.length < 5) {
    return null;
  }

  const encoding = data[0] as ID3TextEncoding;
  let offset = 1;

  let mimeType: string;
  if (isV2_2) {
    const fmtBytes = data.subarray(offset, offset + 3);
    const fmt = String.fromCharCode(...fmtBytes).toLowerCase();
    mimeType = fmt === 'png' ? 'image/png' : 'image/jpeg';
    offset += 3;
  } else {
    const mimeRes = readNullTerminatedString(data, offset, ID3TextEncoding.ISO_8859_1);
    mimeType = mimeRes.value || 'image/jpeg';
    offset = mimeRes.nextOffset;
  }

  if (offset >= data.length) {
    return null;
  }

  const pictureType = data[offset] as ID3PictureType;
  offset += 1;

  const descRes = readNullTerminatedString(data, offset, encoding);
  const description = descRes.value;
  offset = descRes.nextOffset;

  const imageData = data.subarray(offset);

  return {
    mimeType,
    type: pictureType,
    description,
    data: imageData,
  };
}

export function buildApicFrame(
  picture: ID3Picture,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const mimeBytes = encodeText(picture.mimeType || 'image/jpeg', ID3TextEncoding.ISO_8859_1);
  const descBytes = encodeText(picture.description || '', encoding);

  const totalLength =
    1 + // encoding
    mimeBytes.length +
    1 + // null byte for mime
    1 + // picture type
    descBytes.length +
    (encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE ? 2 : 1) + // null byte for description
    picture.data.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;

  result[offset++] = encoding;

  result.set(mimeBytes, offset);
  offset += mimeBytes.length;
  result[offset++] = 0; // null byte

  result[offset++] = typeof picture.type === 'number' ? picture.type : ID3PictureType.FRONT_COVER;

  result.set(descBytes, offset);
  offset += descBytes.length;
  result[offset++] = 0;
  if (encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE) {
    result[offset++] = 0;
  }

  result.set(picture.data, offset);

  return result;
}
