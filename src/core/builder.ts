import { ID3TextEncoding } from '../constants';
import { buildApicFrame } from '../frames/apic';
import { buildCommFrame } from '../frames/comm';
import { buildTextFrame } from '../frames/text';
import { buildTxxxFrame } from '../frames/txxx';
import { buildUsltFrame } from '../frames/uslt';
import type { ID3Tag, WriteOptions } from '../typings';
import { ByteWriter } from './ByteWriter';
import { writeID3Header } from './header';

export function buildFrame(
  id: string,
  data: Uint8Array,
  version: '2.3' | '2.4' = '2.3'
): Uint8Array {
  const frameWriter = new ByteWriter();

  // Frame ID (4 ASCII chars)
  const idStr = (id + '    ').slice(0, 4);
  const idBytes = new Uint8Array([
    idStr.charCodeAt(0),
    idStr.charCodeAt(1),
    idStr.charCodeAt(2),
    idStr.charCodeAt(3),
  ]);
  frameWriter.writeBytes(idBytes);

  // Size
  if (version === '2.4') {
    const syncSafeSize = new Uint8Array([
      (data.length >> 21) & 0x7f,
      (data.length >> 14) & 0x7f,
      (data.length >> 7) & 0x7f,
      data.length & 0x7f,
    ]);
    frameWriter.writeBytes(syncSafeSize);
  } else {
    frameWriter.writeUint32(data.length);
  }

  // Flags (2 bytes)
  frameWriter.writeUint16(0);

  // Data payload
  frameWriter.writeBytes(data);

  return frameWriter.toUint8Array();
}

export function writeTags(tags: ID3Tag, options: WriteOptions = {}): Uint8Array {
  const version = options.version || '2.3';
  const paddingSize = options.padding ?? 1024;
  const framesWriter = new ByteWriter();

  // Text alias mappings
  const textMappings: Record<string, string | undefined> = {
    TIT2: tags.title,
    TPE1: tags.artist,
    TALB: tags.album,
    TRCK: tags.track,
    TYER: tags.year,
    TCON: tags.genre,
    TCOM: tags.composer,
    TPOS: tags.disc,
    TPE2: tags.albumArtist,
  };

  for (const [frameId, textValue] of Object.entries(textMappings)) {
    if (textValue !== undefined && textValue !== '') {
      const payload = buildTextFrame(textValue, ID3TextEncoding.UTF_8);
      const frameBytes = buildFrame(frameId, payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  // Comment frame
  if (tags.comment !== undefined) {
    const payload = buildCommFrame(tags.comment, ID3TextEncoding.UTF_8);
    const frameBytes = buildFrame('COMM', payload, version);
    framesWriter.writeBytes(frameBytes);
  }

  // Unsynchronised Lyrics frame
  const lyricsVal = tags.unsynchronisedLyrics ?? tags.lyrics;
  if (lyricsVal !== undefined) {
    const payload = buildUsltFrame(lyricsVal, ID3TextEncoding.UTF_8);
    const frameBytes = buildFrame('USLT', payload, version);
    framesWriter.writeBytes(frameBytes);
  }

  // Image frame
  if (tags.image !== undefined) {
    const payload = buildApicFrame(tags.image, ID3TextEncoding.UTF_8);
    const frameBytes = buildFrame('APIC', payload, version);
    framesWriter.writeBytes(frameBytes);
  }

  // User defined text frame
  if (tags.userDefinedText !== undefined) {
    const items = Array.isArray(tags.userDefinedText)
      ? tags.userDefinedText
      : [tags.userDefinedText];
    for (const item of items) {
      const payload = buildTxxxFrame(item, ID3TextEncoding.UTF_8);
      const frameBytes = buildFrame('TXXX', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  const framesData = framesWriter.toUint8Array();
  const totalTagContentSize = framesData.length + paddingSize;

  const headerBytes = writeID3Header(totalTagContentSize, version);

  const result = new Uint8Array(headerBytes.length + totalTagContentSize);
  result.set(headerBytes, 0);
  result.set(framesData, headerBytes.length);

  return result;
}
