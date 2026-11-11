import { describe, expect, test } from 'vitest';

import {
  ByteReader,
  ByteWriter,
  decodeSyncSafe,
  encodeSyncSafe,
  ID3PictureType,
  readTags,
  removeTags,
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

  test('should write and read newly supported frames (SYLT, POPM, PRIV, UFID, CHAP, CTOC, WXXX, ETCO, COMR, GEOB, URL)', () => {
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
