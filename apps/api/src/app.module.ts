import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
