import { ID3TextEncoding, ID3V1_TAG_SIZE } from '../constants';
import type { ID3Tag } from '../typings';
import { decodeText, encodeText } from '../utils/encoding';

export function readID3v1Tag(buffer: Uint8Array): Partial<ID3Tag> | null {
  if (buffer.length < ID3V1_TAG_SIZE) {
    return null;
  }

  const offset = buffer.length - ID3V1_TAG_SIZE;
  const tagBytes = buffer.subarray(offset, offset + 3);
  const tagHeader = String.fromCharCode(...tagBytes);

  if (tagHeader !== 'TAG') {
    return null;
  }

  const title = decodeText(
    buffer.subarray(offset + 3, offset + 33),
    ID3TextEncoding.ISO_8859_1
  ).trim();
  const artist = decodeText(
    buffer.subarray(offset + 33, offset + 63),
    ID3TextEncoding.ISO_8859_1
  ).trim();
  const album = decodeText(
    buffer.subarray(offset + 63, offset + 93),
    ID3TextEncoding.ISO_8859_1
  ).trim();
  const year = decodeText(
    buffer.subarray(offset + 93, offset + 97),
    ID3TextEncoding.ISO_8859_1
  ).trim();

  let comment: string;
  let track: string | undefined;

  const commentBytes = buffer.subarray(offset + 97, offset + 127);
  if (commentBytes[28] === 0 && commentBytes[29] !== 0) {
    // ID3v1.1
    comment = decodeText(commentBytes.subarray(0, 28), ID3TextEncoding.ISO_8859_1).trim();
    track = String(commentBytes[29]);
  } else {
    comment = decodeText(commentBytes, ID3TextEncoding.ISO_8859_1).trim();
  }

  const genreId = buffer[offset + 127];

  const result: Partial<ID3Tag> = {};
  if (title) result.title = title;
  if (artist) result.artist = artist;
  if (album) result.album = album;
  if (year) result.year = year;
  if (comment) result.comment = comment;
  if (track) result.track = track;
  if (genreId !== 255) result.genre = String(genreId);

  return result;
}

export function writeID3v1Tag(tags: ID3Tag): Uint8Array {
  const result = new Uint8Array(ID3V1_TAG_SIZE);
  // "TAG"
  result[0] = 0x54;
  result[1] = 0x41;
  result[2] = 0x47;

  const titleBytes = encodeText(tags.title || '', ID3TextEncoding.ISO_8859_1);
  result.set(titleBytes.subarray(0, 30), 3);

  const artistBytes = encodeText(tags.artist || '', ID3TextEncoding.ISO_8859_1);
  result.set(artistBytes.subarray(0, 30), 33);

  const albumBytes = encodeText(tags.album || '', ID3TextEncoding.ISO_8859_1);
  result.set(albumBytes.subarray(0, 30), 63);

  const yearBytes = encodeText(tags.year || '', ID3TextEncoding.ISO_8859_1);
  result.set(yearBytes.subarray(0, 4), 93);

  const commentStr = typeof tags.comment === 'string' ? tags.comment : tags.comment?.text || '';
  const commentBytes = encodeText(commentStr, ID3TextEncoding.ISO_8859_1);

  if (tags.track) {
    const trackNum = parseInt(tags.track, 10);
    result.set(commentBytes.subarray(0, 28), 97);
    result[125] = 0;
    result[126] = Number.isNaN(trackNum) ? 0 : trackNum & 0xff;
  } else {
    result.set(commentBytes.subarray(0, 30), 97);
  }

  const genreNum = parseInt(tags.genre || '255', 10);
  result[127] = Number.isNaN(genreNum) ? 255 : genreNum & 0xff;

  return result;
}
