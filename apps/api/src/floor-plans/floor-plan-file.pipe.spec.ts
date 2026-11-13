import { deflateSync } from 'node:zlib';
import { BadRequestException } from '@nestjs/common';
import { FloorPlanFilePipe, detectImageType } from './floor-plan-file.pipe.js';

export function makePng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const asFile = (buffer: Buffer) =>
  ({ buffer, size: buffer.length }) as Express.Multer.File;

describe('detectImageType', () => {
  it('recognises formats by content', () => {
    expect(detectImageType(makePng(1, 1))?.mimeType).toBe('image/png');
    expect(
      detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.extension,
    ).toBe('jpg');
    expect(
      detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'binary'))?.extension,
    ).toBe('webp');
    expect(
      detectImageType(Buffer.from('﻿<?xml version="1.0"?>\n<svg width="1">'))
        ?.mimeType,
    ).toBe('image/svg+xml');
  });

  it('rejects other content even with an image extension', () => {
    expect(detectImageType(Buffer.from('%PDF-1.7'))).toBeNull();
    expect(detectImageType(Buffer.from('<html><body>'))).toBeNull();
  });
});

describe('FloorPlanFilePipe', () => {
  const pipe = new FloorPlanFilePipe();

  it('returns type and pixel dimensions', () => {
    expect(pipe.transform(asFile(makePng(640, 480)))).toMatchObject({
      mimeType: 'image/png',
      extension: 'png',
      width: 640,
      height: 480,
    });
  });

  it('reads SVG dimensions from the viewBox', () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"></svg>',
    );
    expect(pipe.transform(asFile(svg))).toMatchObject({
      width: 1200,
      height: 800,
    });
  });

  it('requires a file', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });

  it('rejects unsupported content', () => {
    expect(() => pipe.transform(asFile(Buffer.from('hello')))).toThrow(
      /Unsupported file type/,
    );
  });
});
