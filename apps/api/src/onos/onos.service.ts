import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import type {
  OnosDevice,
  OnosHost,
  OnosLink,
  OnosPort,
  OnosSnapshot,
} from './onos.types.js';

@Injectable()
export class OnosService {
  private readonly logger = new Logger(OnosService.name);

  constructor(private readonly http: HttpService) {}

  async getDevices(): Promise<OnosDevice[]> {
    return (
      (await this.get<{ devices: OnosDevice[] }>('/devices')).devices ?? []
    );
  }

  async getDevicePorts(deviceId: string): Promise<OnosPort[]> {
    return (
      (
        await this.get<{ ports: OnosPort[] }>(
          `/devices/${encodeURIComponent(deviceId)}/ports`,
        )
      ).ports ?? []
    );
  }

  async getLinks(): Promise<OnosLink[]> {
    return (await this.get<{ links: OnosLink[] }>('/links')).links ?? [];
  }

  async getHosts(): Promise<OnosHost[]> {
    return (await this.get<{ hosts: OnosHost[] }>('/hosts')).hosts ?? [];
  }

  async getSnapshot(): Promise<OnosSnapshot> {
    const [devices, hosts, links] = await Promise.all([
      this.getDevices(),
      this.getHosts(),
      this.getLinks(),
    ]);
    const withPorts = await Promise.all(
      devices.map(async (d) => ({
        ...d,
        ports: await this.getDevicePorts(d.id),
      })),
    );
    return { devices: withPorts, hosts, links };
  }

  private async get<T>(path: string): Promise<T> {
    try {
      const { data } = await firstValueFrom(this.http.get<T>(path));
      return data;
    } catch (e) {
      throw this.toHttpException(e, `GET ${path}`);
    }
  }

  private toHttpException(e: unknown, op: string): Error {
    if (e instanceof AxiosError) {
      if (!e.response) {
        return new ServiceUnavailableException(
          `ONOS controller is unreachable (${e.code ?? e.message})`,
        );
      }
      this.logger.error(`${op} failed: HTTP ${e.response.status}`);
      return new BadGatewayException(
        `ONOS responded with HTTP ${e.response.status} to ${op}`,
      );
    }
    this.logger.error(`${op} failed`, e instanceof Error ? e.stack : String(e));
    return new BadGatewayException(`ONOS request failed: ${op}`);
  }
}
