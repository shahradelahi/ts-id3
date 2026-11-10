import { ID3V2_HEADER_SIZE } from '../constants';
import type { ID3HeaderInfo } from '../typings';
import { decodeSyncSafe, encodeSyncSafe } from '../utils/sync-safe';
import { ByteReader } from './ByteReader';
import { ByteWriter } from './ByteWriter';

export function readID3Header(reader: ByteReader): ID3HeaderInfo | null {
  if (reader.remaining < ID3V2_HEADER_SIZE) {
    return null;
  }

  const tag = reader.readBytes(3);
  if (tag[0] !== 0x49 || tag[1] !== 0x44 || tag[2] !== 0x33) {
    // "ID3" string check
    reader.skip(-3);
    return null;
  }

  const major = reader.readUint8();
  const minor = reader.readUint8();
  const flagsByte = reader.readUint8();
  const sizeBytes = reader.readBytes(4);

  const size = decodeSyncSafe(sizeBytes);

  return {
    version: {
      major,
      minor,
    },
    flags: {
      unsynchronisation: (flagsByte & 0x80) !== 0,
      extendedHeader: (flagsByte & 0x40) !== 0,
      experimental: (flagsByte & 0x20) !== 0,
      footerPresent: (flagsByte & 0x10) !== 0,
    },
    size,
  };
}

export function writeID3Header(size: number, version: '2.3' | '2.4' = '2.3'): Uint8Array {
  const writer = new ByteWriter();
  // "ID3"
  writer.writeUint8(0x49);
  writer.writeUint8(0x44);
  writer.writeUint8(0x33);

  // Version: 2.3 -> major 3, minor 0; 2.4 -> major 4, minor 0
  if (version === '2.4') {
    writer.writeUint8(4);
  } else {
    writer.writeUint8(3);
  }
  writer.writeUint8(0);

  // Flags: 0
  writer.writeUint8(0);

  // Size (sync-safe integer)
  writer.writeBytes(encodeSyncSafe(size));

  return writer.toUint8Array();
}
