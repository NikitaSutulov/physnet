import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { OnosService } from './onos.service.js';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        baseURL: config.get('ONOS_URL', { infer: true }).replace(/\/+$/, ''),
        timeout: config.get('ONOS_TIMEOUT_MS', { infer: true }),
        auth: {
          username: config.get('ONOS_USER', { infer: true }),
          password: config.get('ONOS_PASSWORD', { infer: true }),
        },
        headers: { Accept: 'application/json' },
      }),
    }),
  ],
  providers: [OnosService],
  exports: [OnosService],
})
export class OnosModule {}
