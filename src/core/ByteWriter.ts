export class ByteWriter {
  #chunks: Uint8Array[] = [];
  #size = 0;

  get length(): number {
    return this.#size;
  }

  writeUint8(value: number): void {
    const chunk = new Uint8Array([value & 0xff]);
    this.#chunks.push(chunk);
    this.#size += 1;
  }

  writeUint16(value: number): void {
    const chunk = new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
    this.#chunks.push(chunk);
    this.#size += 2;
  }

  writeUint32(value: number): void {
    const chunk = new Uint8Array([
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
    ]);
    this.#chunks.push(chunk);
    this.#size += 4;
  }

  writeBytes(bytes: Uint8Array): void {
    if (bytes.length > 0) {
      this.#chunks.push(bytes);
      this.#size += bytes.length;
    }
  }

  toUint8Array(): Uint8Array {
    const result = new Uint8Array(this.#size);
    let offset = 0;
    for (const chunk of this.#chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
