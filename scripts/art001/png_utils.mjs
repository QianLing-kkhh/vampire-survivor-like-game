import fs from 'node:fs';
import zlib from 'node:zlib';

import crypto from 'node:crypto';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  return crc32Polyfill(buf);
}

function crc32Polyfill(buf) {
  let crc = 0xffffffff;

  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) {
    return a;
  }
  if (pb <= pc) {
    return b;
  }
  return c;
}

function bytesPerPixel(colorType) {
  switch (colorType) {
    case 0:
      return 1;
    case 2:
      return 3;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new Error(`Unsupported PNG color type: ${colorType}`);
  }
}

function readUInt32BE(buffer, offset) {
  return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
}

function parsePngChunks(buffer) {
  if (buffer.length < 8 || !buffer.slice(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Not a valid PNG file.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 8;
  const idat = [];

  while (offset + 8 <= buffer.length) {
    const length = readUInt32BE(buffer, offset);
    const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;

    if (chunkEnd > buffer.length) {
      throw new Error('Invalid PNG chunk boundaries.');
    }

    const data = buffer.slice(dataStart, dataEnd);

    if (type === 'IHDR') {
      if (length !== 13) {
        throw new Error('Unsupported IHDR length.');
      }
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = chunkEnd;
  }

  if (width <= 0 || height <= 0 || !idat.length) {
    throw new Error('Invalid or unsupported PNG data.');
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    idat: Buffer.concat(idat),
  };
}

export function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parsed = parsePngChunks(buffer);
  const { width, height, bitDepth, colorType } = parsed;

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  }

  const bpp = bytesPerPixel(colorType);
  const decoded = zlib.inflateSync(parsed.idat);
  const rowByteLength = width * bpp;
  const stride = rowByteLength + 1;

  if (decoded.length < stride * height) {
    throw new Error('PNG scanline buffer is incomplete.');
  }

  const output = new Uint8ClampedArray(width * height * 4);
  const previous = new Uint8Array(rowByteLength);

  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = decoded[cursor];
    const scanline = decoded.slice(cursor + 1, cursor + stride);
    const recon = new Uint8Array(rowByteLength);

    for (let x = 0; x < rowByteLength; x += 1) {
      const left = x >= bpp ? recon[x - bpp] : 0;
      const above = previous[x] ?? 0;
      const upperLeft = x >= bpp ? previous[x - bpp] : 0;
      let value = scanline[x];

      if (filterType === 1) {
        value = (value + left) & 0xff;
      } else if (filterType === 2) {
        value = (value + above) & 0xff;
      } else if (filterType === 3) {
        value = (value + Math.floor((left + above) / 2)) & 0xff;
      } else if (filterType === 4) {
        value = (value + paeth(left, above, upperLeft)) & 0xff;
      } else if (filterType !== 0) {
        throw new Error(`Unsupported PNG filter: ${filterType}`);
      }

      recon[x] = value;
    }

    for (let x = 0; x < width; x += 1) {
      const src = x * bpp;
      const outOffset = (y * width + x) * 4;
      if (colorType === 2) {
        output[outOffset] = recon[src];
        output[outOffset + 1] = recon[src + 1];
        output[outOffset + 2] = recon[src + 2];
        output[outOffset + 3] = 255;
      } else if (colorType === 6) {
        output[outOffset] = recon[src];
        output[outOffset + 1] = recon[src + 1];
        output[outOffset + 2] = recon[src + 2];
        output[outOffset + 3] = recon[src + 3];
      } else if (colorType === 4) {
        output[outOffset] = recon[src];
        output[outOffset + 1] = recon[src];
        output[outOffset + 2] = recon[src];
        output[outOffset + 3] = recon[src + 1];
      } else {
        output[outOffset] = recon[src];
        output[outOffset + 1] = recon[src];
        output[outOffset + 2] = recon[src];
        output[outOffset + 3] = 255;
      }
    }

    previous.set(recon);
    cursor += stride;
  }

  return {
    width,
    height,
    colorType,
    pixels: output,
  };
}

export function getPngInfo(filePath) {
  const { width, height } = readPng(filePath);
  return { width, height };
}

export function writePng(filePath, png) {
  const { width, height, pixels } = png;
  const rowLength = width * 4;
  const rawLength = (rowLength + 1) * height;
  const raw = Buffer.alloc(rawLength);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * rowLength;
    const rawOffset = y * (rowLength + 1);
    raw[rawOffset] = 0;
    for (let i = 0; i < rowLength; i += 1) {
      raw[rawOffset + 1 + i] = pixels[rowOffset + i];
    }
  }

  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunks = [
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ];

  fs.writeFileSync(filePath, Buffer.concat([PNG_SIGNATURE, ...chunks]));
}

export function copyFrameToCanvas(dstPixels, dstWidth, dstHeight, srcPng, dstX, dstY) {
  const { width: srcWidth, height: srcHeight, pixels: srcPixels } = srcPng;
  for (let y = 0; y < srcHeight; y += 1) {
    if (dstY + y >= dstHeight) break;
    for (let x = 0; x < srcWidth; x += 1) {
      if (dstX + x >= dstWidth) break;
      const srcOffset = (y * srcWidth + x) * 4;
      const dstOffset = ((dstY + y) * dstWidth + (dstX + x)) * 4;
      dstPixels[dstOffset] = srcPixels[srcOffset];
      dstPixels[dstOffset + 1] = srcPixels[srcOffset + 1];
      dstPixels[dstOffset + 2] = srcPixels[srcOffset + 2];
      dstPixels[dstOffset + 3] = srcPixels[srcOffset + 3];
    }
  }
}

export function composeHorizontalStrip(pngFrames, frameWidth, frameHeight) {
  const width = frameWidth * pngFrames.length;
  const height = frameHeight;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pngFrames.length; i += 1) {
    copyFrameToCanvas(pixels, width, height, pngFrames[i], i * frameWidth, 0);
  }

  return { width, height, pixels };
}

export function composeGrid(pngRows, frameWidth, frameHeight, columns) {
  const cols = Math.max(1, Math.min(columns, pngRows.length));
  const rows = Math.ceil(pngRows.length / cols);
  const width = cols * frameWidth;
  const height = rows * frameHeight;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pngRows.length; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    copyFrameToCanvas(pixels, width, height, pngRows[index], col * frameWidth, row * frameHeight);
  }

  return { width, height, pixels };
}

export function cropImage(png, x, y, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const srcOffset = ((y + row) * png.width + (x + col)) * 4;
      const dstOffset = (row * width + col) * 4;
      out[dstOffset] = png.pixels[srcOffset];
      out[dstOffset + 1] = png.pixels[srcOffset + 1];
      out[dstOffset + 2] = png.pixels[srcOffset + 2];
      out[dstOffset + 3] = png.pixels[srcOffset + 3];
    }
  }

  return { width, height, pixels: out };
}

export function resizeImage(png, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const srcY = Math.min(png.height - 1, Math.floor((y * png.height) / height));
    for (let x = 0; x < width; x += 1) {
      const srcX = Math.min(png.width - 1, Math.floor((x * png.width) / width));
      const srcOffset = (srcY * png.width + srcX) * 4;
      const dstOffset = (y * width + x) * 4;
      out[dstOffset] = png.pixels[srcOffset];
      out[dstOffset + 1] = png.pixels[srcOffset + 1];
      out[dstOffset + 2] = png.pixels[srcOffset + 2];
      out[dstOffset + 3] = png.pixels[srcOffset + 3];
    }
  }

  return { width, height, pixels: out };
}

export function sha1Hash(pixels) {
  return crypto.createHash('sha1').update(Buffer.from(pixels)).digest('hex');
}

