export { ID3PictureType, ID3TextEncoding } from './constants';
export { ByteReader } from './core/ByteReader';
export { ByteWriter } from './core/ByteWriter';
export { writeTags } from './core/builder';
export { readID3Header, writeID3Header } from './core/header';
export { readTags } from './core/parser';
export { removeTags, updateTags } from './core/updater';
export { ID3Error } from './errors';
export type {
  ID3Comment,
  ID3HeaderInfo,
  ID3Picture,
  ID3RawFrame,
  ID3Tag,
  ID3UnsynchronisedLyrics,
  ID3UserDefinedText,
  ReadOptions,
  WriteOptions,
} from './typings';
export { decodeSyncSafe, encodeSyncSafe } from './utils/sync-safe';
