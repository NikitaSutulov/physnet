import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadOptions {
  key: string;
  body: PutObjectCommandInput['Body'];
  contentType?: string;
  bucket?: string;
}

export interface StorageOptions {
  key: string;
  bucket?: string;
}

export interface PresignedUrlOptions {
  key: string;
  bucket?: string;
  expiresIn?: number;
  contentType?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;

  constructor() {
    const endpoint = process.env['S3_ENDPOINT'] ?? 'http://localhost:3900';
    const region = process.env['S3_REGION'] ?? 'garage';
    const accessKeyId = process.env['S3_ACCESS_KEY_ID'] ?? 'physnet_access_key';
    const secretAccessKey =
      process.env['S3_SECRET_ACCESS_KEY'] ?? 'physnet_secret_key';

    this.defaultBucket = process.env['S3_BUCKET'] ?? 'physnet';

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    this.logger.log(`Initialized S3 storage client for endpoint: ${endpoint}`);
  }

  get client(): S3Client {
    return this.s3Client;
  }

  get bucket(): string {
    return this.defaultBucket;
  }

  async upload({ key, body, contentType, bucket }: UploadOptions) {
    const targetBucket = bucket ?? this.defaultBucket;
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    return await this.s3Client.send(command);
  }

  async get({ key, bucket }: StorageOptions): Promise<GetObjectCommandOutput> {
    const targetBucket = bucket ?? this.defaultBucket;
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    return await this.s3Client.send(command);
  }

  async delete({ key, bucket }: StorageOptions) {
    const targetBucket = bucket ?? this.defaultBucket;
    const command = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    return await this.s3Client.send(command);
  }

  async exists({ key, bucket }: StorageOptions): Promise<boolean> {
    const targetBucket = bucket ?? this.defaultBucket;
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: targetBucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async list({ prefix, bucket }: { prefix?: string; bucket?: string } = {}) {
    const targetBucket = bucket ?? this.defaultBucket;
    const command = new ListObjectsV2Command({
      Bucket: targetBucket,
      Prefix: prefix,
    });

    const response = await this.s3Client.send(command);
    return response.Contents ?? [];
  }

  async getPresignedDownloadUrl({
    key,
    bucket,
    expiresIn = 3600,
  }: StorageOptions & { expiresIn?: number }): Promise<string> {
    const targetBucket = bucket ?? this.defaultBucket;
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getPresignedUploadUrl({
    key,
    bucket,
    contentType,
    expiresIn = 3600,
  }: PresignedUrlOptions): Promise<string> {
    const targetBucket = bucket ?? this.defaultBucket;
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
