import { FRAME_ALIAS_MAP, ID3V2_HEADER_SIZE } from '../constants';
import { parseApicFrame } from '../frames/apic';
import { parseChapFrame } from '../frames/chap';
import { parseCommFrame } from '../frames/comm';
import { parseComrFrame } from '../frames/comr';
import { parseCtocFrame } from '../frames/ctoc';
import { parseEtcoFrame } from '../frames/etco';
import { parseGeobFrame } from '../frames/geob';
import { readID3v1Tag } from '../frames/id3v1';
import { parsePopmFrame } from '../frames/popm';
import { parsePrivFrame } from '../frames/priv';
import { parseSyltFrame } from '../frames/sylt';
import { parseTextFrame } from '../frames/text';
import { parseTxxxFrame } from '../frames/txxx';
import { parseUfidFrame } from '../frames/ufid';
import { parseUrlFrame } from '../frames/url';
import { parseUsltFrame } from '../frames/uslt';
import { parseWxxxFrame } from '../frames/wxxx';
import type {
  ID3Chapter,
  ID3Commercial,
  ID3GeneralEncapsulatedObject,
  ID3Private,
  ID3RawFrame,
  ID3SynchronisedLyrics,
  ID3TableOfContents,
  ID3Tag,
  ID3UniqueFileIdentifier,
  ID3UserDefinedText,
  ID3UserDefinedUrl,
  ReadOptions,
} from '../typings';
import { decodeSyncSafe, decodeUint32 } from '../utils/sync-safe';
import { ByteReader } from './ByteReader';
import { readID3Header } from './header';

function pushOrSet<T>(obj: Record<string, unknown>, key: string, val: T): void {
  if (obj[key] === undefined) {
    obj[key] = val;
  } else if (Array.isArray(obj[key])) {
    (obj[key] as T[]).push(val);
  } else {
    obj[key] = [obj[key] as T, val];
  }
}

/**
 * Parse ID3 frames from frame body payload.
 */
export function parseID3Body(
  buffer: Uint8Array,
  isV2_2 = false,
  isV2_4 = false,
  options: ReadOptions = {}
): ID3Tag {
  const result: ID3Tag = {};
  const reader = new ByteReader(buffer);
  const rawFrames: ID3RawFrame[] = [];

  while (reader.remaining > (isV2_2 ? 6 : 10)) {
    const frameHeaderStart = reader.offset;

    let id: string;
    let frameSize: number;
    let flags = 0;

    if (isV2_2) {
      const idBytes = reader.readBytes(3);
      if ((idBytes[0] ?? 0) === 0) {
        reader.offset = frameHeaderStart;
        break; // Padding reached
      }
      id = String.fromCharCode(...idBytes);
      const szBytes = reader.readBytes(3);
      const b0 = szBytes[0] ?? 0;
      const b1 = szBytes[1] ?? 0;
      const b2 = szBytes[2] ?? 0;
      frameSize = (b0 << 16) | (b1 << 8) | b2;
    } else {
      const idBytes = reader.readBytes(4);
      if ((idBytes[0] ?? 0) === 0) {
        reader.offset = frameHeaderStart;
        break; // Padding reached
      }
      id = String.fromCharCode(...idBytes);
      const szBytes = reader.readBytes(4);
      frameSize = isV2_4 ? decodeSyncSafe(szBytes) : decodeUint32(szBytes);
      flags = reader.readUint16();
    }

    if (frameSize <= 0 || frameSize > reader.remaining) {
      if (options.strict) {
        break;
      }
      break;
    }

    const frameData = reader.readBytes(frameSize);

    if (options.includeRawFrames) {
      rawFrames.push({ id, size: frameSize, flags, data: frameData });
    }

    const alias = FRAME_ALIAS_MAP[id] || id;

    if (id === 'APIC' || id === 'PIC') {
      const pic = parseApicFrame(frameData, isV2_2);
      if (pic) {
        result.image = pic;
      }
    } else if (id === 'COMM' || id === 'COM') {
      const comm = parseCommFrame(frameData);
      if (comm) {
        result.comment = comm;
      }
    } else if (id === 'USLT' || id === 'ULT') {
      const uslt = parseUsltFrame(frameData);
      if (uslt) {
        result.unsynchronisedLyrics = uslt;
      }
    } else if (id === 'SYLT' || id === 'SLT') {
      const sylt = parseSyltFrame(frameData);
      if (sylt) {
        pushOrSet<ID3SynchronisedLyrics>(
          result as Record<string, unknown>,
          'synchronisedLyrics',
          sylt
        );
      }
    } else if (id === 'TXXX' || id === 'TXX') {
      const txxx = parseTxxxFrame(frameData);
      if (txxx) {
        pushOrSet<ID3UserDefinedText>(result as Record<string, unknown>, 'userDefinedText', txxx);
      }
    } else if (id === 'POPM' || id === 'POP') {
      const popm = parsePopmFrame(frameData);
      if (popm) {
        result.popularimeter = popm;
      }
    } else if (id === 'PRIV') {
      const priv = parsePrivFrame(frameData);
      if (priv) {
        pushOrSet<ID3Private>(result as Record<string, unknown>, 'private', priv);
      }
    } else if (id === 'UFID' || id === 'UFI') {
      const ufid = parseUfidFrame(frameData);
      if (ufid) {
        pushOrSet<ID3UniqueFileIdentifier>(
          result as Record<string, unknown>,
          'uniqueFileIdentifier',
          ufid
        );
      }
    } else if (id === 'CHAP') {
      const chap = parseChapFrame(frameData, (subBuf) =>
        parseID3Body(subBuf, isV2_2, isV2_4, options)
      );
      if (chap) {
        pushOrSet<ID3Chapter>(result as Record<string, unknown>, 'chapter', chap);
      }
    } else if (id === 'CTOC') {
      const ctoc = parseCtocFrame(frameData, (subBuf) =>
        parseID3Body(subBuf, isV2_2, isV2_4, options)
      );
      if (ctoc) {
        pushOrSet<ID3TableOfContents>(result as Record<string, unknown>, 'tableOfContents', ctoc);
      }
    } else if (id === 'WXXX' || id === 'WXX') {
      const wxxx = parseWxxxFrame(frameData);
      if (wxxx) {
        pushOrSet<ID3UserDefinedUrl>(result as Record<string, unknown>, 'userDefinedUrl', wxxx);
      }
    } else if (id === 'ETCO' || id === 'ETC') {
      const etco = parseEtcoFrame(frameData);
      if (etco) {
        result.eventTimingCodes = etco;
      }
    } else if (id === 'COMR' || id === 'CMR') {
      const comr = parseComrFrame(frameData);
      if (comr) {
        pushOrSet<ID3Commercial>(result as Record<string, unknown>, 'commercialFrame', comr);
      }
    } else if (id === 'GEOB' || id === 'GEO') {
      const geob = parseGeobFrame(frameData);
      if (geob) {
        pushOrSet<ID3GeneralEncapsulatedObject>(
          result as Record<string, unknown>,
          'generalObject',
          geob
        );
      }
    } else if (id.startsWith('W')) {
      const urlVal = parseUrlFrame(frameData);
      pushOrSet<string>(result as Record<string, unknown>, alias, urlVal);
    } else if (id.startsWith('T')) {
      const textVal = parseTextFrame(frameData);
      if (alias && alias !== id) {
        result[alias] = textVal;
      } else {
        result[id] = textVal;
      }
    }
  }

  if (options.includeRawFrames && rawFrames.length > 0) {
    result.rawFrames = rawFrames;
  }

  return result;
}

/**
 * Read and parse ID3 tags from audio file buffer.
 *
 * @example
 * ```ts
 * const tags = readTags(buffer);
 * console.log(tags.title, tags.artist);
 * ```
 */
export function readTags(buffer: Uint8Array, options: ReadOptions = {}): ID3Tag {
  let result: ID3Tag = {};
  const reader = new ByteReader(buffer);

  const header = readID3Header(reader);

  if (header) {
    const isV2_2 = header.version.major === 2;
    const isV2_4 = header.version.major === 4;
    const tagEndOffset = ID3V2_HEADER_SIZE + header.size;

    if (header.flags.extendedHeader) {
      if (reader.remaining >= 4) {
        const extSize = isV2_4
          ? decodeSyncSafe(reader.readBytes(4))
          : decodeUint32(reader.readBytes(4));
        reader.skip(extSize - 4);
      }
    }

    const bodyLen = tagEndOffset - reader.offset;
    if (bodyLen > 0 && reader.remaining >= bodyLen) {
      const bodyBytes = reader.readBytes(bodyLen);
      result = parseID3Body(bodyBytes, isV2_2, isV2_4, options);
    }
  }

  // Fallback / merge ID3v1 tags if ID3v2 tags missing or partial
  const v1Tag = readID3v1Tag(buffer);
  if (v1Tag) {
    for (const [key, value] of Object.entries(v1Tag)) {
      if (result[key] === undefined) {
        result[key] = value;
      }
    }
  }

  return result;
}
