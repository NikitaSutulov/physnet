import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdministratorsModule } from './administrators/administrators.module.js';
import { FloorPlansModule } from './floor-plans/floor-plans.module.js';
import { EventsModule } from './events/events.module.js';
import { OnosModule } from './onos/onos.module.js';
import { SyncModule } from './sync/sync.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { TopologyModule } from './topology/topology.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    AdministratorsModule,
    FloorPlansModule,
    EventsModule,
    OnosModule,
    SyncModule,
    DevicesModule,
    TopologyModule,
    RealtimeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
