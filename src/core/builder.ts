import { ID3TextEncoding } from '../constants';
import { buildApicFrame } from '../frames/apic';
import { buildChapFrame } from '../frames/chap';
import { buildCommFrame } from '../frames/comm';
import { buildComrFrame } from '../frames/comr';
import { buildCtocFrame } from '../frames/ctoc';
import { buildEtcoFrame } from '../frames/etco';
import { buildGeobFrame } from '../frames/geob';
import { buildPopmFrame } from '../frames/popm';
import { buildPrivFrame } from '../frames/priv';
import { buildSyltFrame } from '../frames/sylt';
import { buildTextFrame } from '../frames/text';
import { buildTxxxFrame } from '../frames/txxx';
import { buildUfidFrame } from '../frames/ufid';
import { buildUrlFrame } from '../frames/url';
import { buildUsltFrame } from '../frames/uslt';
import { buildWxxxFrame } from '../frames/wxxx';
import type { ID3Tag, WriteOptions } from '../typings';
import { ByteWriter } from './ByteWriter';
import { writeID3Header } from './header';

/**
 * Build raw ID3 frame with header and data payload.
 */
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

/**
 * Build concatenated ID3 frames payload from tag object.
 */
export function buildSubTagsPayload(tags: ID3Tag, version: '2.3' | '2.4' = '2.3'): Uint8Array {
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

  // Synchronised Lyrics frame
  if (tags.synchronisedLyrics !== undefined) {
    const items = Array.isArray(tags.synchronisedLyrics)
      ? tags.synchronisedLyrics
      : [tags.synchronisedLyrics];
    for (const item of items) {
      const payload = buildSyltFrame(item, ID3TextEncoding.UTF_8);
      const frameBytes = buildFrame('SYLT', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
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

  // Popularimeter
  if (tags.popularimeter !== undefined) {
    const payload = buildPopmFrame(tags.popularimeter);
    const frameBytes = buildFrame('POPM', payload, version);
    framesWriter.writeBytes(frameBytes);
  }

  // Private frame
  if (tags.private !== undefined) {
    const items = Array.isArray(tags.private) ? tags.private : [tags.private];
    for (const item of items) {
      const payload = buildPrivFrame(item);
      const frameBytes = buildFrame('PRIV', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  // Unique File Identifier
  if (tags.uniqueFileIdentifier !== undefined) {
    const items = Array.isArray(tags.uniqueFileIdentifier)
      ? tags.uniqueFileIdentifier
      : [tags.uniqueFileIdentifier];
    for (const item of items) {
      const payload = buildUfidFrame(item);
      const frameBytes = buildFrame('UFID', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  // Chapter
  if (tags.chapter !== undefined) {
    const items = Array.isArray(tags.chapter) ? tags.chapter : [tags.chapter];
    for (const item of items) {
      const payload = buildChapFrame(item, (subTags) => buildSubTagsPayload(subTags, version));
      const frameBytes = buildFrame('CHAP', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  // Table of Contents
  if (tags.tableOfContents !== undefined) {
    const items = Array.isArray(tags.tableOfContents)
      ? tags.tableOfContents
      : [tags.tableOfContents];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item) {
        const payload = buildCtocFrame(item, i === 0, (subTags) =>
          buildSubTagsPayload(subTags, version)
        );
        const frameBytes = buildFrame('CTOC', payload, version);
        framesWriter.writeBytes(frameBytes);
      }
    }
  }

  // User defined URL
  if (tags.userDefinedUrl !== undefined) {
    const items = Array.isArray(tags.userDefinedUrl) ? tags.userDefinedUrl : [tags.userDefinedUrl];
    for (const item of items) {
      const payload = buildWxxxFrame(item, ID3TextEncoding.UTF_8);
      const frameBytes = buildFrame('WXXX', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  // Event Timing Codes
  if (tags.eventTimingCodes !== undefined) {
    const payload = buildEtcoFrame(tags.eventTimingCodes);
    const frameBytes = buildFrame('ETCO', payload, version);
    framesWriter.writeBytes(frameBytes);
  }

  // Commercial Frame
  if (tags.commercialFrame !== undefined) {
    const items = Array.isArray(tags.commercialFrame)
      ? tags.commercialFrame
      : [tags.commercialFrame];
    for (const item of items) {
      const payload = buildComrFrame(item, ID3TextEncoding.UTF_8);
      const frameBytes = buildFrame('COMR', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  // General Object
  if (tags.generalObject !== undefined) {
    const items = Array.isArray(tags.generalObject) ? tags.generalObject : [tags.generalObject];
    for (const item of items) {
      const payload = buildGeobFrame(item, ID3TextEncoding.UTF_8);
      const frameBytes = buildFrame('GEOB', payload, version);
      framesWriter.writeBytes(frameBytes);
    }
  }

  // Standard URL frames
  const urlMappings: Record<string, string | string[] | undefined> = {
    WCOM: tags.commercialUrl,
    WCOP: tags.copyrightUrl,
    WOAF: tags.fileUrl,
    WOAR: tags.artistUrl,
    WOAS: tags.audioSourceUrl,
    WORS: tags.radioStationUrl,
    WPAY: tags.paymentUrl,
    WPUB: tags.publisherUrl,
  };

  for (const [frameId, urlValue] of Object.entries(urlMappings)) {
    if (urlValue !== undefined) {
      const urls = Array.isArray(urlValue) ? urlValue : [urlValue];
      for (const url of urls) {
        if (url) {
          const payload = buildUrlFrame(url);
          const frameBytes = buildFrame(frameId, payload, version);
          framesWriter.writeBytes(frameBytes);
        }
      }
    }
  }

  return framesWriter.toUint8Array();
}

/**
 * Build complete ID3 binary buffer including header and padding.
 *
 * @example
 * ```ts
 * const buffer = writeTags({ title: 'Song Title', artist: 'Artist Name' });
 * ```
 */
export function writeTags(tags: ID3Tag, options: WriteOptions = {}): Uint8Array {
  const version = options.version || '2.3';
  const paddingSize = options.padding ?? 1024;

  const framesData = buildSubTagsPayload(tags, version);
  const totalTagContentSize = framesData.length + paddingSize;

  const headerBytes = writeID3Header(totalTagContentSize, version);

  const result = new Uint8Array(headerBytes.length + totalTagContentSize);
  result.set(headerBytes, 0);
  result.set(framesData, headerBytes.length);

  return result;
}
