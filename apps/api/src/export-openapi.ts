import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { createOpenApiDocument } from './swagger.js';

const target = process.argv[2] ?? 'openapi.json';
const app = await NestFactory.create(AppModule, {
  preview: true,
  logger: ['error', 'warn'],
});
app.setGlobalPrefix('api');
const document = createOpenApiDocument(app);
await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
await app.close();
console.log(`OpenAPI document written to ${target}`);
