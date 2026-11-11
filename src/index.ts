export { ID3PictureType, ID3TextEncoding } from './constants';
export { ByteReader } from './core/ByteReader';
export { ByteWriter } from './core/ByteWriter';
export { writeTags } from './core/builder';
export { readID3Header, writeID3Header } from './core/header';
export { readTags } from './core/parser';
export { removeTags, updateTags } from './core/updater';
export { ID3Error } from './errors';
export type {
  ID3Chapter,
  ID3Comment,
  ID3Commercial,
  ID3EventTimingCodes,
  ID3GeneralEncapsulatedObject,
  ID3HeaderInfo,
  ID3KeyEvent,
  ID3Picture,
  ID3Popularimeter,
  ID3Private,
  ID3RawFrame,
  ID3SynchronisedLyrics,
  ID3SynchronisedLyricsPart,
  ID3TableOfContents,
  ID3Tag,
  ID3UniqueFileIdentifier,
  ID3UnsynchronisedLyrics,
  ID3UserDefinedText,
  ID3UserDefinedUrl,
  ReadOptions,
  WriteOptions,
} from './typings';
export { decodeSyncSafe, encodeSyncSafe } from './utils/sync-safe';
