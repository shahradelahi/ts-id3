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

export interface ID3UnsynchronisedLyrics {
  language?: string;
  shortDescription?: string;
  text: string;
}

export interface ID3SynchronisedLyricsPart {
  text: string;
  timeStamp: number;
}

export interface ID3SynchronisedLyrics {
  language: string;
  timeStampFormat: number;
  contentType: number;
  shortDescription?: string;
  synchronisedText: ID3SynchronisedLyricsPart[];
}

export interface ID3UserDefinedText {
  description: string;
  value: string;
}

export interface ID3Popularimeter {
  email: string;
  rating: number;
  counter: number;
}

export interface ID3Private {
  ownerIdentifier: string;
  data: Uint8Array;
}

export interface ID3UniqueFileIdentifier {
  ownerIdentifier: string;
  identifier: Uint8Array;
}

export interface ID3Chapter {
  elementID: string;
  startTimeMs: number;
  endTimeMs: number;
  startOffsetBytes?: number;
  endOffsetBytes?: number;
  tags?: ID3Tag;
}

export interface ID3TableOfContents {
  elementID: string;
  isOrdered?: boolean;
  elements: string[];
  tags?: ID3Tag;
}

export interface ID3UserDefinedUrl {
  description: string;
  url: string;
}

export interface ID3KeyEvent {
  type: number;
  timeStamp: number;
}

export interface ID3EventTimingCodes {
  timeStampFormat: number;
  keyEvents: ID3KeyEvent[];
}

export interface ID3Commercial {
  prices?: Record<string, string>;
  validUntil?: {
    year: number;
    month: number;
    day: number;
  };
  contactUrl?: string;
  receivedAs?: number;
  nameOfSeller?: string;
  description?: string;
  sellerLogo?: {
    mimeType?: string;
    picture: Uint8Array;
  };
}

export interface ID3GeneralEncapsulatedObject {
  mimeType?: string;
  filename?: string;
  contentDescription: string;
  encapsulatedObject: Uint8Array;
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
  unsynchronisedLyrics?: ID3UnsynchronisedLyrics | string;
  lyrics?: ID3UnsynchronisedLyrics | string;
  synchronisedLyrics?: ID3SynchronisedLyrics | ID3SynchronisedLyrics[];
  image?: ID3Picture;
  userDefinedText?: ID3UserDefinedText | ID3UserDefinedText[];
  popularimeter?: ID3Popularimeter;
  private?: ID3Private | ID3Private[];
  uniqueFileIdentifier?: ID3UniqueFileIdentifier | ID3UniqueFileIdentifier[];
  chapter?: ID3Chapter | ID3Chapter[];
  tableOfContents?: ID3TableOfContents | ID3TableOfContents[];
  userDefinedUrl?: ID3UserDefinedUrl | ID3UserDefinedUrl[];
  eventTimingCodes?: ID3EventTimingCodes;
  commercialFrame?: ID3Commercial | ID3Commercial[];
  generalObject?: ID3GeneralEncapsulatedObject | ID3GeneralEncapsulatedObject[];
  commercialUrl?: string | string[];
  copyrightUrl?: string;
  fileUrl?: string;
  artistUrl?: string | string[];
  audioSourceUrl?: string;
  radioStationUrl?: string;
  paymentUrl?: string;
  publisherUrl?: string;
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
