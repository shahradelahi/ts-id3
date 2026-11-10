import { FRAME_ALIAS_MAP, ID3V2_HEADER_SIZE } from '../constants';
import { parseApicFrame } from '../frames/apic';
import { parseCommFrame } from '../frames/comm';
import { readID3v1Tag } from '../frames/id3v1';
import { parseTextFrame } from '../frames/text';
import { parseTxxxFrame } from '../frames/txxx';
import { parseUsltFrame } from '../frames/uslt';
import type { ID3RawFrame, ID3Tag, ID3UserDefinedText, ReadOptions } from '../typings';
import { decodeSyncSafe, decodeUint32 } from '../utils/sync-safe';
import { ByteReader } from './ByteReader';
import { readID3Header } from './header';

export function readTags(buffer: Uint8Array, options: ReadOptions = {}): ID3Tag {
  const result: ID3Tag = {};
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

    const rawFrames: ID3RawFrame[] = [];
    const userDefinedTexts: ID3UserDefinedText[] = [];

    while (reader.offset < tagEndOffset && reader.remaining > (isV2_2 ? 6 : 10)) {
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
      } else if (id === 'TXXX' || id === 'TXX') {
        const txxx = parseTxxxFrame(frameData);
        if (txxx) {
          userDefinedTexts.push(txxx);
        }
      } else if (id.startsWith('T')) {
        const textVal = parseTextFrame(frameData);
        if (alias && alias !== id) {
          result[alias] = textVal;
        } else {
          result[id] = textVal;
        }
      }
    }

    if (userDefinedTexts.length > 0) {
      result.userDefinedText =
        userDefinedTexts.length === 1 ? userDefinedTexts[0] : userDefinedTexts;
    }

    if (options.includeRawFrames && rawFrames.length > 0) {
      result.rawFrames = rawFrames;
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
