/**
 * Decode 28-bit sync-safe integer from 4 bytes.
 */
export function decodeSyncSafe(bytes: Uint8Array): number {
  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;
  const b2 = bytes[2] ?? 0;
  const b3 = bytes[3] ?? 0;
  return ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f);
}

/**
 * Encode integer into 4-byte sync-safe format.
 */
export function encodeSyncSafe(size: number): Uint8Array {
  return new Uint8Array([
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ]);
}

/**
 * Decode 32-bit big-endian integer from 4 bytes.
 */
export function decodeUint32(bytes: Uint8Array): number {
  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;
  const b2 = bytes[2] ?? 0;
  const b3 = bytes[3] ?? 0;
  return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
}

/**
 * Encode integer into 4-byte big-endian Uint8Array.
 */
export function encodeUint32(value: number): Uint8Array {
  return new Uint8Array([
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ]);
}

/**
 * Remove unsynchronisation bytes from buffer (0xFF 0x00 -> 0xFF).
 */
export function removeUnsynchronisation(buffer: Uint8Array): Uint8Array {
  let count = 0;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0x00) {
      count++;
      i++;
    }
  }
  if (count === 0) {
    return buffer;
  }
  const out = new Uint8Array(buffer.length - count);
  let j = 0;
  for (let i = 0; i < buffer.length; i++) {
    out[j++] = buffer[i]!;
    if (buffer[i] === 0xff && i + 1 < buffer.length && buffer[i + 1] === 0x00) {
      i++;
    }
  }
  return out;
}

/**
 * Apply unsynchronisation scheme to buffer.
 */
export function applyUnsynchronisation(buffer: Uint8Array): Uint8Array {
  let extra = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (
      buffer[i] === 0xff &&
      (i + 1 === buffer.length || buffer[i + 1] === 0x00 || (buffer[i + 1]! & 0xe0) === 0xe0)
    ) {
      extra++;
    }
  }
  if (extra === 0) {
    return buffer;
  }
  const out = new Uint8Array(buffer.length + extra);
  let j = 0;
  for (let i = 0; i < buffer.length; i++) {
    out[j++] = buffer[i]!;
    if (
      buffer[i] === 0xff &&
      (i + 1 === buffer.length || buffer[i + 1] === 0x00 || (buffer[i + 1]! & 0xe0) === 0xe0)
    ) {
      out[j++] = 0x00;
    }
  }
  return out;
}
