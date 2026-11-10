<h1 align="center">
  <sup>@se-oss/id3</sup>
  <br>
  <a href="https://github.com/shahradelahi/ts-id3/actions/workflows/ci.yml"><img src="https://github.com/shahradelahi/ts-id3/actions/workflows/ci.yml/badge.svg?branch=main&event=push" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@se-oss/id3"><img src="https://img.shields.io/npm/v/@se-oss/id3.svg" alt="NPM Version"></a>
  <a href="/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat" alt="MIT License"></a>
  <a href="https://bundlephobia.com/package/@se-oss/id3"><img src="https://img.shields.io/bundlephobia/minzip/@se-oss/id3" alt="npm bundle size"></a>
  <a href="https://packagephobia.com/result?p=@se-oss/id3"><img src="https://packagephobia.com/badge?p=@se-oss/id3" alt="Install Size"></a>
</h1>

_@se-oss/id3_ is a ID3 parser and builder for TypeScript and JavaScript.

---

- [Installation](#-installation)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#license)

## 📦 Installation

```bash
npm install @se-oss/id3
```

<details>
<summary>Install using your favorite package manager</summary>

**pnpm**

```bash
pnpm install @se-oss/id3
```

**yarn**

```bash
yarn add @se-oss/id3
```

</details>

## 📖 Usage

### Parsing Tags

```typescript
import { readTags } from '@se-oss/id3';

const buffer = new Uint8Array(/* MP3 binary bytes */);
const tags = readTags(buffer);

console.log(tags.title);
console.log(tags.artist);
console.log(tags.album);
console.log(tags.image?.mimeType);
```

### Writing Tags

```typescript
import { ID3PictureType, writeTags } from '@se-oss/id3';

const id3Buffer = writeTags({
  title: 'New Standards',
  artist: 'Shahrad Elahi',
  album: 'The Open Source EP',
  year: '2026',
  image: {
    mimeType: 'image/jpeg',
    type: ID3PictureType.FRONT_COVER,
    description: 'Cover Art',
    data: new Uint8Array([/* image bytes */]),
  },
});
```

### Updating & Removing Tags

```typescript
import { removeTags, updateTags } from '@se-oss/id3';

// Update ID3 tags in an existing audio file buffer
const updatedBuffer = updateTags(fileBuffer, {
  title: 'Updated Title',
});

// Remove existing ID3 header from file buffer
const cleanedBuffer = removeTags(fileBuffer);
```

## 🤝 Contributing

Want to contribute? Star the project or raise issues on [GitHub](https://github.com/shahradelahi/ts-id3).

Thanks again for your support! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/ts-id3/graphs/contributors).
