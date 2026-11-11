import type { ID3EventTimingCodes, ID3KeyEvent } from '../typings';

export function parseEtcoFrame(data: Uint8Array): ID3EventTimingCodes | null {
  if (data.length < 1) {
    return null;
  }

  const timeStampFormat = data[0] ?? 1;
  const keyEvents: ID3KeyEvent[] = [];
  let offset = 1;

  while (offset + 5 <= data.length) {
    const type = data[offset++] ?? 0;
    const view = new DataView(data.buffer, data.byteOffset + offset, 4);
    const timeStamp = view.getUint32(0, false);
    offset += 4;

    keyEvents.push({ type, timeStamp });
  }

  return { timeStampFormat, keyEvents };
}

export function buildEtcoFrame(etco: ID3EventTimingCodes): Uint8Array {
  const events = etco.keyEvents || [];
  const result = new Uint8Array(1 + events.length * 5);
  let offset = 0;

  result[offset++] = etco.timeStampFormat ?? 1;

  for (const event of events) {
    result[offset++] = event.type ?? 0;
    const view = new DataView(result.buffer, result.byteOffset + offset, 4);
    view.setUint32(0, event.timeStamp ?? 0, false);
    offset += 4;
  }

  return result;
}
