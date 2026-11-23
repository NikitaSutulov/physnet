import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origins: string[],
  ) {
    super(app);
  }

  override createIOServer(
    port: number | undefined,
    options?: ServerOptions,
  ): Server {
    const cors = { origin: this.origins, credentials: true };
    return super.createIOServer(port, options && { ...options, cors });
  }
}
