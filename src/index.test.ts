import { describe, expect, test } from 'vitest';

import {
  applyUnsynchronisation,
  ByteReader,
  ByteWriter,
  decodeSyncSafe,
  encodeSyncSafe,
  ID3PictureType,
  readTags,
  removeTags,
  removeUnsynchronisation,
  updateTags,
  writeTags,
} from './index';

describe('Sync-Safe Integer Utils', () => {
  test('should correctly encode and decode sync-safe integers', () => {
    const values = [0, 127, 255, 1000, 65535, 100000];
    for (const val of values) {
      const encoded = encodeSyncSafe(val);
      expect(encoded.length).toBe(4);
      const decoded = decodeSyncSafe(encoded);
      expect(decoded).toBe(val);
    }
  });
});

describe('Unsynchronisation Utils & Tag-Wide Handling', () => {
  test('should correctly apply and remove unsynchronisation', () => {
    const raw = new Uint8Array([0xff, 0xfe, 0xff, 0x00, 0xff, 0xe0, 0x01, 0xff]);
    const unsynced = applyUnsynchronisation(raw);
    expect(unsynced).toEqual(
      new Uint8Array([0xff, 0x00, 0xfe, 0xff, 0x00, 0x00, 0xff, 0x00, 0xe0, 0x01, 0xff, 0x00])
    );
    const restored = removeUnsynchronisation(unsynced);
    expect(restored).toEqual(raw);
  });

  test('should parse tag-wide unsynchronised ID3v2.3 tags correctly', () => {
    function unsync(b: Uint8Array): Uint8Array {
      return applyUnsynchronisation(b);
    }

    const makeFrame = (id: string, data: Uint8Array) => {
      const h = new Uint8Array(10);
      h[0] = id.charCodeAt(0);
      h[1] = id.charCodeAt(1);
      h[2] = id.charCodeAt(2);
      h[3] = id.charCodeAt(3);
      h[4] = (data.length >> 24) & 0xff;
      h[5] = (data.length >> 16) & 0xff;
      h[6] = (data.length >> 8) & 0xff;
      h[7] = data.length & 0xff;
      const res = new Uint8Array(10 + data.length);
      res.set(h, 0);
      res.set(data, 10);
      return res;
    };

    const titlePayload = new Uint8Array([
      0x01, // UTF-16 with BOM
      0xff,
      0xfe, // BOM
      84,
      0,
      105,
      0,
      116,
      0,
      108,
      0,
      101,
      0, // "Title" in UTF-16LE
    ]);
    const artistPayload = new Uint8Array([0x00, ...Buffer.from('Artist', 'latin1')]);

    const tit2 = makeFrame('TIT2', titlePayload);
    const tpe1 = makeFrame('TPE1', artistPayload);

    const rawBody = new Uint8Array(tit2.length + tpe1.length);
    rawBody.set(tit2, 0);
    rawBody.set(tpe1, tit2.length);

    const unsyncedBody = unsync(rawBody);

    const ss = (n: number) =>
      new Uint8Array([(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127]);

    const header = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x80]); // "ID3", v2.3, flag 0x80 (unsync)
    const tag = new Uint8Array(10 + unsyncedBody.length);
    tag.set(header, 0);
    tag.set(ss(unsyncedBody.length), 6);
    tag.set(unsyncedBody, 10);

    const parsed = readTags(tag);
    expect(parsed.title).toBe('Title');
    expect(parsed.artist).toBe('Artist');
  });
});

describe('ByteReader and ByteWriter', () => {
  test('should read and write binary primitive types', () => {
    const writer = new ByteWriter();
    writer.writeUint8(255);
    writer.writeUint16(65535);
    writer.writeUint32(4294967295);
    writer.writeBytes(new Uint8Array([1, 2, 3]));

    const buffer = writer.toUint8Array();
    const reader = new ByteReader(buffer);

    expect(reader.readUint8()).toBe(255);
    expect(reader.readUint16()).toBe(65535);
    expect(reader.readUint32()).toBe(4294967295);
    expect(Array.from(reader.readBytes(3))).toEqual([1, 2, 3]);
    expect(reader.remaining).toBe(0);
  });
});

describe('ID3 Parsing & Building', () => {
  test('should write and read ID3v2 text tags', () => {
    const tags = {
      title: 'New Standards',
      artist: 'Shahrad Elahi',
      album: 'The Open Source EP',
      year: '2026',
      track: '1',
      genre: 'Electronic',
    };

    const id3Buffer = writeTags(tags);
    expect(id3Buffer).toBeInstanceOf(Uint8Array);

    const parsed = readTags(id3Buffer);
    expect(parsed.title).toBe('New Standards');
    expect(parsed.artist).toBe('Shahrad Elahi');
    expect(parsed.album).toBe('The Open Source EP');
    expect(parsed.year).toBe('2026');
    expect(parsed.track).toBe('1');
    expect(parsed.genre).toBe('Electronic');
  });

  test('should write and read ID3v2 picture frames', () => {
    const dummyImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    const tags = {
      title: 'Cover Art Track',
      image: {
        mimeType: 'image/png',
        type: ID3PictureType.FRONT_COVER,
        description: 'Front Cover PNG',
        data: dummyImageData,
      },
    };

    const id3Buffer = writeTags(tags);
    const parsed = readTags(id3Buffer);

    expect(parsed.title).toBe('Cover Art Track');
    expect(parsed.image).toBeDefined();
    expect(parsed.image?.mimeType).toBe('image/png');
    expect(parsed.image?.type).toBe(ID3PictureType.FRONT_COVER);
    expect(parsed.image?.description).toBe('Front Cover PNG');
    expect(Array.from(parsed.image!.data)).toEqual(Array.from(dummyImageData));
  });

  test('should write and read ID3v2 comment and userDefinedText frames', () => {
    const tags = {
      title: 'Comment Test',
      comment: {
        language: 'eng',
        shortDescription: 'Notes',
        text: 'This is a test comment.',
      },
      userDefinedText: {
        description: 'ISRC',
        value: 'US1234567890',
      },
      unsynchronisedLyrics: {
        language: 'eng',
        shortDescription: '',
        text: 'Line 1\nLine 2',
      },
    };

    const id3Buffer = writeTags(tags);
    const parsed = readTags(id3Buffer);

    expect(parsed.title).toBe('Comment Test');
    expect(typeof parsed.comment).toBe('object');
    expect((parsed.comment as any).text).toBe('This is a test comment.');
    expect((parsed.userDefinedText as any).description).toBe('ISRC');
    expect((parsed.userDefinedText as any).value).toBe('US1234567890');
    expect(typeof parsed.unsynchronisedLyrics).toBe('object');
    expect((parsed.unsynchronisedLyrics as any).text).toBe('Line 1\nLine 2');
  });

  test('should update and remove tags from audio buffers', () => {
    const fakeAudio = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]); // Fake MP3 frames
    const initialBuffer = updateTags(fakeAudio, { title: 'Initial Title' });

    const initialParsed = readTags(initialBuffer);
    expect(initialParsed.title).toBe('Initial Title');

    const updatedBuffer = updateTags(initialBuffer, {
      title: 'Updated Title',
      artist: 'New Artist',
    });
    const updatedParsed = readTags(updatedBuffer);
    expect(updatedParsed.title).toBe('Updated Title');
    expect(updatedParsed.artist).toBe('New Artist');

    const cleanedBuffer = removeTags(updatedBuffer);
    const cleanedParsed = readTags(cleanedBuffer);
    expect(cleanedParsed.title).toBeUndefined();
    expect(cleanedBuffer.length).toBe(fakeAudio.length);
  });

  test('should write and read supported frames (SYLT, POPM, PRIV, UFID, CHAP, CTOC, WXXX, ETCO, COMR, GEOB, URL)', () => {
    const tags = {
      title: 'Advanced Tags',
      synchronisedLyrics: {
        language: 'eng',
        timeStampFormat: 2,
        contentType: 1,
        shortDescription: 'Chorus',
        synchronisedText: [
          { text: 'Hello', timeStamp: 1000 },
          { text: 'World', timeStamp: 2000 },
        ],
      },
      popularimeter: {
        email: 'user@example.com',
        rating: 128,
        counter: 42,
      },
      private: {
        ownerIdentifier: 'com.example.app',
        data: new Uint8Array([1, 2, 3, 4]),
      },
      uniqueFileIdentifier: {
        ownerIdentifier: 'http://example.com/id',
        identifier: new Uint8Array([10, 20, 30]),
      },
      chapter: {
        elementID: 'ch1',
        startTimeMs: 0,
        endTimeMs: 10000,
        tags: {
          title: 'Chapter 1',
        },
      },
      tableOfContents: {
        elementID: 'toc1',
        isOrdered: true,
        elements: ['ch1'],
        tags: {
          title: 'Table of Contents',
        },
      },
      userDefinedUrl: {
        description: 'Homepage',
        url: 'https://example.com',
      },
      eventTimingCodes: {
        timeStampFormat: 2,
        keyEvents: [{ type: 1, timeStamp: 500 }],
      },
      commercialFrame: {
        prices: { USD: '9.99' },
        validUntil: { year: 2030, month: 12, day: 31 },
        contactUrl: 'https://store.example.com',
        receivedAs: 1,
        nameOfSeller: 'Acme Music',
        description: 'Digital Download',
      },
      generalObject: {
        mimeType: 'application/octet-stream',
        filename: 'data.bin',
        contentDescription: 'Binary payload',
        encapsulatedObject: new Uint8Array([5, 6, 7, 8]),
      },
      commercialUrl: 'https://buy.example.com',
    };

    const id3Buffer = writeTags(tags as any);
    const parsed = readTags(id3Buffer);

    expect(parsed.title).toBe('Advanced Tags');
    expect((parsed.synchronisedLyrics as any).language).toBe('eng');
    expect((parsed.synchronisedLyrics as any).synchronisedText).toHaveLength(2);
    expect((parsed.popularimeter as any).email).toBe('user@example.com');
    expect((parsed.popularimeter as any).rating).toBe(128);
    expect((parsed.popularimeter as any).counter).toBe(42);
    expect((parsed.private as any).ownerIdentifier).toBe('com.example.app');
    expect(Array.from((parsed.private as any).data)).toEqual([1, 2, 3, 4]);
    expect((parsed.uniqueFileIdentifier as any).ownerIdentifier).toBe('http://example.com/id');
    expect(Array.from((parsed.uniqueFileIdentifier as any).identifier)).toEqual([10, 20, 30]);
    expect((parsed.chapter as any).elementID).toBe('ch1');
    expect((parsed.chapter as any).tags?.title).toBe('Chapter 1');
    expect((parsed.tableOfContents as any).elementID).toBe('toc1');
    expect((parsed.tableOfContents as any).elements).toEqual(['ch1']);
    expect((parsed.tableOfContents as any).tags?.title).toBe('Table of Contents');
    expect((parsed.userDefinedUrl as any).description).toBe('Homepage');
    expect((parsed.userDefinedUrl as any).url).toBe('https://example.com');
    expect((parsed.eventTimingCodes as any).keyEvents).toHaveLength(1);
    expect((parsed.commercialFrame as any).nameOfSeller).toBe('Acme Music');
    expect((parsed.generalObject as any).filename).toBe('data.bin');
    expect(parsed.commercialUrl as any).toBe('https://buy.example.com');
  });
});
