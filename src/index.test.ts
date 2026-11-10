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
    };

    const id3Buffer = writeTags(tags);
    const parsed = readTags(id3Buffer);

    expect(parsed.title).toBe('Comment Test');
    expect(typeof parsed.comment).toBe('object');
    expect((parsed.comment as any).text).toBe('This is a test comment.');
    expect((parsed.userDefinedText as any).description).toBe('ISRC');
    expect((parsed.userDefinedText as any).value).toBe('US1234567890');
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
});
