import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError, type AxiosResponse, type Method } from 'axios';
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

  async registerApplication(appId: string): Promise<void> {
    await this.request(
      'POST',
      `/applications/${encodeURIComponent(appId)}/register`,
    );
  }

  async submitIntent(body: Record<string, unknown>): Promise<void> {
    await this.request('POST', '/intents', body);
  }

  async getIntentState(appId: string, key: string): Promise<string | null> {
    const res = await this.request<{ state?: string }>(
      'GET',
      `/intents/${encodeURIComponent(appId)}/${encodeURIComponent(key)}`,
      undefined,
      { notFound: isMissingIntent },
    );
    return res?.data.state ?? null;
  }

  async getApplicationIntentStates(
    appId: string,
  ): Promise<Map<string, string>> {
    const res = await this.request<{
      intents?: Array<{ key: string; state: string }>;
    }>('GET', `/intents/application/${encodeURIComponent(appId)}`, undefined, {
      notFound: isNotFound,
    });
    return new Map((res?.data.intents ?? []).map((i) => [i.key, i.state]));
  }

  async withdrawIntent(appId: string, key: string): Promise<void> {
    await this.request(
      'DELETE',
      `/intents/${encodeURIComponent(appId)}/${encodeURIComponent(key)}`,
      undefined,
      { notFound: isMissingIntent },
    );
  }

  async setPortState(
    deviceId: string,
    port: string,
    enabled: boolean,
  ): Promise<void> {
    await this.request(
      'POST',
      `/devices/${encodeURIComponent(deviceId)}/portstate/${encodeURIComponent(port)}`,
      { enabled },
    );
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.request<T>('GET', path);
    return res!.data;
  }

  private async request<T = unknown>(
    method: Method,
    path: string,
    data?: unknown,
    { notFound }: { notFound?: (e: AxiosError) => boolean } = {},
  ): Promise<AxiosResponse<T> | null> {
    try {
      return await firstValueFrom(
        this.http.request<T>({
          method,
          url: path,
          data,
          ...(data === undefined && { headers: { 'Content-Type': false } }),
        }),
      );
    } catch (e) {
      if (notFound && e instanceof AxiosError && notFound(e)) return null;
      throw this.toHttpException(e, `${method.toUpperCase()} ${path}`);
    }
  }

  private toHttpException(e: unknown, op: string): Error {
    if (e instanceof AxiosError) {
      if (!e.response) {
        return new ServiceUnavailableException(
          `ONOS controller is unreachable (${e.code ?? e.message})`,
        );
      }
      const body = e.response.data as { message?: unknown } | undefined;
      const reason =
        typeof body?.message === 'string' ? `: ${body.message}` : '';
      this.logger.error(`${op} failed: HTTP ${e.response.status}${reason}`);
      return new BadGatewayException(
        `ONOS responded with HTTP ${e.response.status} to ${op}${reason}`,
      );
    }
    this.logger.error(`${op} failed`, e instanceof Error ? e.stack : String(e));
    return new BadGatewayException(`ONOS request failed: ${op}`);
  }
}

const isNotFound = (e: AxiosError) => e.response?.status === 404;

function isMissingIntent(e: AxiosError): boolean {
  if (isNotFound(e)) return true;
  const body: unknown = e.response?.data;
  return (
    e.response?.status === 400 &&
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string' &&
    body.message.startsWith('For input string')
  );
}
