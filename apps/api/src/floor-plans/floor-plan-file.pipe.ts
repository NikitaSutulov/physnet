import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  PipeTransform,
} from '@nestjs/common';
import { imageSize } from 'image-size';
import { FLOOR_PLAN_MAX_BYTES } from '@physnet/shared';

export interface ValidatedFloorPlanFile {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
}

/**
 * Validates an uploaded floor plan by its content, not its declared
 * Content-Type: detects PNG/JPEG/WEBP by magic bytes and SVG by markup,
 * then reads the pixel dimensions required by the canvas.
 */
@Injectable()
export class FloorPlanFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  ValidatedFloorPlanFile
> {
  transform(file: Express.Multer.File | undefined): ValidatedFloorPlanFile {
    if (!file) throw new BadRequestException('Floor plan file is required');
    if (file.size > FLOOR_PLAN_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `File exceeds ${FLOOR_PLAN_MAX_BYTES / 1024 / 1024} MB`,
      );
    }

    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException(
        'Unsupported file type: allowed PNG, JPEG, WEBP or SVG',
      );
    }

    let width: number | undefined;
    let height: number | undefined;
    try {
      ({ width, height } = imageSize(file.buffer));
    } catch {
      // handled below
    }
    if (!width || !height) {
      throw new BadRequestException(
        type.extension === 'svg'
          ? 'SVG must declare width/height or a viewBox'
          : 'Could not read image dimensions',
      );
    }

    return { buffer: file.buffer, ...type, width, height };
  }
}

export function detectImageType(
  buf: Buffer,
): { mimeType: string; extension: string } | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  const head = buf.toString('utf8', 0, 2048).replace(/^﻿/, '').trimStart();
  if (head.startsWith('<') && /<svg[\s>]/i.test(head)) {
    return { mimeType: 'image/svg+xml', extension: 'svg' };
  }
  return null;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
