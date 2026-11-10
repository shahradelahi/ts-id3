import { ID3V1_TAG_SIZE, ID3V2_HEADER_SIZE } from '../constants';
import type { ID3Tag, WriteOptions } from '../typings';
import { writeTags } from './builder';
import { ByteReader } from './ByteReader';
import { readID3Header } from './header';
import { readTags } from './parser';

export function removeTags(buffer: Uint8Array): Uint8Array {
  const reader = new ByteReader(buffer);
  const header = readID3Header(reader);

  let startOffset = 0;
  if (header) {
    startOffset = ID3V2_HEADER_SIZE + header.size;
  }

  let endOffset = buffer.length;
  if (buffer.length >= ID3V1_TAG_SIZE) {
    const v1TagCheck = buffer.subarray(
      buffer.length - ID3V1_TAG_SIZE,
      buffer.length - ID3V1_TAG_SIZE + 3
    );
    if (v1TagCheck[0] === 0x54 && v1TagCheck[1] === 0x41 && v1TagCheck[2] === 0x47) {
      // "TAG"
      endOffset = buffer.length - ID3V1_TAG_SIZE;
    }
  }

  if (startOffset === 0 && endOffset === buffer.length) {
    return buffer;
  }

  return buffer.subarray(startOffset, endOffset);
}

export function updateTags(
  buffer: Uint8Array,
  newTags: ID3Tag,
  options: WriteOptions = {}
): Uint8Array {
  const existingTags = readTags(buffer);
  const mergedTags: ID3Tag = { ...existingTags, ...newTags };

  const cleanedAudio = removeTags(buffer);
  const newID3Header = writeTags(mergedTags, options);

  const result = new Uint8Array(newID3Header.length + cleanedAudio.length);
  result.set(newID3Header, 0);
  result.set(cleanedAudio, newID3Header.length);

  return result;
}
