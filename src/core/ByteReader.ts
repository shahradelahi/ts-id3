import { ID3Error } from '../errors';

/**
 * Sequential binary byte reader for Uint8Array buffers.
 */
export class ByteReader {
  #bytes: Uint8Array;
  #view: DataView;
  #offset = 0;

  constructor(buffer: Uint8Array) {
    this.#bytes = buffer;
    this.#view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  get offset(): number {
    return this.#offset;
  }

  set offset(val: number) {
    this.#offset = val;
  }

  get length(): number {
    return this.#bytes.length;
  }

  get remaining(): number {
    return this.#bytes.length - this.#offset;
  }

  readUint8(): number {
    if (this.#offset + 1 > this.#bytes.length) {
      throw new ID3Error('Unexpected end of buffer reading Uint8');
    }
    const val = this.#view.getUint8(this.#offset);
    this.#offset += 1;
    return val;
  }

  readUint16(): number {
    if (this.#offset + 2 > this.#bytes.length) {
      throw new ID3Error('Unexpected end of buffer reading Uint16');
    }
    const val = this.#view.getUint16(this.#offset, false);
    this.#offset += 2;
    return val;
  }

  readUint32(): number {
    if (this.#offset + 4 > this.#bytes.length) {
      throw new ID3Error('Unexpected end of buffer reading Uint32');
    }
    const val = this.#view.getUint32(this.#offset, false);
    this.#offset += 4;
    return val;
  }

  readBytes(length: number): Uint8Array {
    if (this.#offset + length > this.#bytes.length) {
      throw new ID3Error('Unexpected end of buffer reading bytes');
    }
    const slice = this.#bytes.subarray(this.#offset, this.#offset + length);
    this.#offset += length;
    return slice;
  }

  peekBytes(length: number): Uint8Array {
    if (this.#offset + length > this.#bytes.length) {
      return this.#bytes.subarray(this.#offset);
    }
    return this.#bytes.subarray(this.#offset, this.#offset + length);
  }

  skip(length: number): void {
    this.#offset = Math.min(this.#bytes.length, this.#offset + length);
  }
}
