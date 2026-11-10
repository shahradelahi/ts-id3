import type { ID3PictureType } from './constants';

export interface ID3Picture {
  mimeType: string;
  type: ID3PictureType | number;
  description?: string;
  data: Uint8Array;
}

export interface ID3Comment {
  language: string;
  shortDescription?: string;
  text: string;
}

export interface ID3UserDefinedText {
  description: string;
  value: string;
}

export interface ID3RawFrame {
  id: string;
  size: number;
  flags?: number;
  data: Uint8Array;
}

export interface ID3Tag {
  title?: string;
  artist?: string;
  album?: string;
  track?: string;
  year?: string;
  genre?: string;
  composer?: string;
  disc?: string;
  albumArtist?: string;
  comment?: ID3Comment | string;
  image?: ID3Picture;
  userDefinedText?: ID3UserDefinedText | ID3UserDefinedText[];
  rawFrames?: ID3RawFrame[];
  [key: string]: unknown;
}

export interface ReadOptions {
  strict?: boolean;
  includeRawFrames?: boolean;
}

export interface WriteOptions {
  version?: '2.3' | '2.4';
  padding?: number;
}

export interface ID3HeaderInfo {
  version: {
    major: number;
    minor: number;
  };
  flags: {
    unsynchronisation: boolean;
    extendedHeader: boolean;
    experimental: boolean;
    footerPresent: boolean;
  };
  size: number;
}
