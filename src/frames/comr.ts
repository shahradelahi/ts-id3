import { ID3TextEncoding } from '../constants';
import type { ID3Commercial } from '../typings';
import { decodeText, encodeText, readNullTerminatedString } from '../utils/encoding';

export function parseComrFrame(data: Uint8Array): ID3Commercial | null {
  if (data.length < 12) {
    return null;
  }

  const encoding = data[0] as ID3TextEncoding;
  let offset = 1;

  const priceRes = readNullTerminatedString(data, offset, ID3TextEncoding.ISO_8859_1);
  const priceStr = priceRes.value;
  offset = priceRes.nextOffset;

  const prices: Record<string, string> = {};
  for (const price of priceStr.split('/').filter((p) => p.length > 3)) {
    prices[price.slice(0, 3)] = price.slice(3);
  }

  const validUntilStrBytes = data.subarray(offset, offset + 8);
  offset += 8;
  const validUntilStr = decodeText(validUntilStrBytes, ID3TextEncoding.ISO_8859_1);
  const validUntil = { year: 0, month: 0, day: 0 };
  if (/^\d{8}$/.test(validUntilStr)) {
    validUntil.year = parseInt(validUntilStr.slice(0, 4), 10);
    validUntil.month = parseInt(validUntilStr.slice(4, 6), 10);
    validUntil.day = parseInt(validUntilStr.slice(6, 8), 10);
  }

  const contactRes = readNullTerminatedString(data, offset, ID3TextEncoding.ISO_8859_1);
  const contactUrl = contactRes.value;
  offset = contactRes.nextOffset;

  const receivedAs = data[offset++] ?? 0;

  const sellerRes = readNullTerminatedString(data, offset, encoding);
  const nameOfSeller = sellerRes.value;
  offset = sellerRes.nextOffset;

  const descRes = readNullTerminatedString(data, offset, encoding);
  const description = descRes.value;
  offset = descRes.nextOffset;

  let sellerLogo: { mimeType?: string; picture: Uint8Array } | undefined;
  if (offset < data.length) {
    const mimeRes = readNullTerminatedString(data, offset, ID3TextEncoding.ISO_8859_1);
    const mimeType = mimeRes.value;
    offset = mimeRes.nextOffset;
    const picture = data.subarray(offset);
    sellerLogo = { mimeType, picture };
  }

  return {
    prices,
    validUntil,
    contactUrl,
    receivedAs,
    nameOfSeller,
    description,
    sellerLogo,
  };
}

export function buildComrFrame(
  comr: ID3Commercial,
  encoding: ID3TextEncoding = ID3TextEncoding.UTF_8
): Uint8Array {
  const priceString = Object.entries(comr.prices || {})
    .map(([curr, val]) => `${curr.slice(0, 3)}${val}`)
    .join('/');
  const priceBytes = encodeText(priceString, ID3TextEncoding.ISO_8859_1);

  const vu = comr.validUntil || { year: 0, month: 0, day: 0 };
  const vuStr = `${String(vu.year).padStart(4, '0').slice(0, 4)}${String(vu.month)
    .padStart(2, '0')
    .slice(0, 2)}${String(vu.day).padStart(2, '0').slice(0, 2)}`;
  const vuBytes = encodeText(vuStr, ID3TextEncoding.ISO_8859_1);

  const contactBytes = encodeText(comr.contactUrl || '', ID3TextEncoding.ISO_8859_1);
  const nameBytes = encodeText(comr.nameOfSeller || '', encoding);
  const descBytes = encodeText(comr.description || '', encoding);

  const nullLen =
    encoding === ID3TextEncoding.UTF_16 || encoding === ID3TextEncoding.UTF_16BE ? 2 : 1;

  let logoHeaderLen = 0;
  let mimeBytes: Uint8Array = new Uint8Array(0);
  let picBytes: Uint8Array = new Uint8Array(0);
  if (comr.sellerLogo) {
    mimeBytes = encodeText(comr.sellerLogo.mimeType || '', ID3TextEncoding.ISO_8859_1);
    picBytes = comr.sellerLogo.picture || new Uint8Array(0);
    logoHeaderLen = mimeBytes.length + 1 + picBytes.length;
  }

  const totalLen =
    1 + // encoding
    priceBytes.length +
    1 + // null
    8 + // valid until
    contactBytes.length +
    1 + // null
    1 + // received as
    nameBytes.length +
    nullLen +
    descBytes.length +
    nullLen +
    logoHeaderLen;

  const result = new Uint8Array(totalLen);
  let offset = 0;

  result[offset++] = encoding;

  result.set(priceBytes, offset);
  offset += priceBytes.length;
  result[offset++] = 0;

  result.set(vuBytes.subarray(0, 8), offset);
  offset += 8;

  result.set(contactBytes, offset);
  offset += contactBytes.length;
  result[offset++] = 0;

  result[offset++] = comr.receivedAs ?? 0;

  result.set(nameBytes, offset);
  offset += nameBytes.length;
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

  if (comr.sellerLogo) {
    result.set(mimeBytes, offset);
    offset += mimeBytes.length;
    result[offset++] = 0;

    result.set(picBytes, offset);
  }

  return result;
}
