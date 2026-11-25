import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_INTENT_PRIORITY,
  type IntentState,
  type IntentType,
  type PolicyPayload,
  type RoutingPolicyResponse,
} from '@physnet/shared';
import type { Env } from '../config/env.js';
import { SystemEventsService } from '../events/system-events.service.js';
import type { Prisma, RoutingPolicy } from '../generated/prisma/client.js';
import { policyIntentKey, toOnosIntent } from '../onos/intent.mapper.js';
import { OnosService } from '../onos/onos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreatePolicyDto,
  PolicyPayloadInput,
  UpdatePolicyDto,
} from './dto/policy.dto.js';

const withCreator = {
  creator: { select: { firstName: true, lastName: true } },
} as const;
type PolicyRow = RoutingPolicy & {
  creator: { firstName: string; lastName: string };
};

@Injectable()
export class PoliciesService {
  private readonly appId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly onos: OnosService,
    private readonly events: SystemEventsService,
    config: ConfigService<Env, true>,
  ) {
    this.appId = config.get('ONOS_APP_ID', { infer: true });
  }

  async findAll(): Promise<RoutingPolicyResponse[]> {
    const rows = await this.prisma.routingPolicy.findMany({
      include: withCreator,
      orderBy: { createdAt: 'desc' },
    });
    const states = rows.some((r) => r.isApplied)
      ? await this.fromOnos(() =>
          this.onos.getApplicationIntentStates(this.appId),
        )
      : null;
    return rows.map((r) => {
      if (!r.isApplied || !r.intentKey) return toResponse(r, 'NOT_APPLIED');
      if (!states?.ok) return toResponse(r, 'UNKNOWN');
      return toResponse(r, asIntentState(states.value.get(r.intentKey)));
    });
  }

  async findOne(id: string): Promise<RoutingPolicyResponse> {
    const row = await this.getOrThrow(id);
    if (!row.isApplied || !row.intentKey) return toResponse(row, 'NOT_APPLIED');
    const key = row.intentKey;
    const state = await this.fromOnos(() =>
      this.onos.getIntentState(this.appId, key),
    );
    return toResponse(row, state.ok ? asIntentState(state.value) : 'UNKNOWN');
  }

  async create(
    dto: CreatePolicyDto,
    createdBy: string,
  ): Promise<RoutingPolicyResponse> {
    const payload = await this.normalise(dto.payload);
    const row = await this.prisma.routingPolicy.create({
      data: {
        name: dto.name,
        intentType: payload.type,
        payload: toJson(payload),
        createdBy,
      },
      include: withCreator,
    });
    return toResponse(row, 'NOT_APPLIED');
  }

  async update(
    id: string,
    dto: UpdatePolicyDto,
  ): Promise<RoutingPolicyResponse> {
    const current = await this.getOrThrow(id);
    if (current.isApplied) {
      throw new ConflictException('Withdraw the policy before editing it');
    }
    const payload = dto.payload ? await this.normalise(dto.payload) : undefined;
    const row = await this.prisma.routingPolicy.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(payload && {
          intentType: payload.type,
          payload: toJson(payload),
        }),
      },
      include: withCreator,
    });
    return toResponse(row, 'NOT_APPLIED');
  }

  async remove(id: string): Promise<void> {
    const row = await this.getOrThrow(id);
    if (row.isApplied && row.intentKey) {
      await this.onos.withdrawIntent(this.appId, row.intentKey);
    }
    await this.prisma.routingPolicy.delete({ where: { id } });
    if (row.isApplied) {
      this.publish(row, `Політику «${row.name}» відкликано та видалено`);
    }
  }

  async apply(id: string): Promise<RoutingPolicyResponse> {
    const row = await this.getOrThrow(id);
    if (row.isApplied)
      throw new ConflictException('The policy is already applied');
    await this.onos.registerApplication(this.appId);
    const intentKey = policyIntentKey(row.id);
    await this.onos.submitIntent(
      toOnosIntent(readPayload(row), this.appId, intentKey),
    );
    const updated = await this.prisma.routingPolicy.update({
      where: { id },
      data: { isApplied: true, intentKey },
      include: withCreator,
    });
    this.publish(updated, `Політику «${row.name}» застосовано`);
    const state = await this.fromOnos(() =>
      this.onos.getIntentState(this.appId, intentKey),
    );
    return toResponse(
      updated,
      state.ok && state.value ? asIntentState(state.value) : 'INSTALLING',
    );
  }

  async withdraw(id: string): Promise<RoutingPolicyResponse> {
    const row = await this.getOrThrow(id);
    if (!row.isApplied || !row.intentKey) {
      throw new ConflictException('The policy is not applied');
    }
    await this.onos.withdrawIntent(this.appId, row.intentKey);
    const updated = await this.prisma.routingPolicy.update({
      where: { id },
      data: { isApplied: false, intentKey: null },
      include: withCreator,
    });
    this.publish(updated, `Політику «${row.name}» відкликано`);
    return toResponse(updated, 'NOT_APPLIED');
  }

  private async normalise(input: PolicyPayloadInput): Promise<PolicyPayload> {
    const priority = input.priority ?? DEFAULT_INTENT_PRIORITY;

    if (input.type === 'HostToHostIntent') {
      if (input.one === input.two) {
        throw new BadRequestException('Choose two different hosts');
      }
      const hosts = await this.prisma.networkDevice.count({
        where: {
          deviceType: 'HOST',
          onosDeviceId: { in: [input.one, input.two] },
        },
      });
      if (hosts !== 2) throw new BadRequestException('Host not found');
      return { type: input.type, one: input.one, two: input.two, priority };
    }

    if (input.type === 'PointToPointIntent') {
      const { ingressPoint, egressPoint, selector } = input;
      if (
        ingressPoint.device === egressPoint.device &&
        ingressPoint.port === egressPoint.port
      ) {
        throw new BadRequestException(
          'Ingress and egress must be different ports',
        );
      }
      for (const point of [ingressPoint, egressPoint]) {
        const port = await this.prisma.devicePort.findFirst({
          where: {
            portNumber: point.port,
            device: { onosDeviceId: point.device, deviceType: { not: 'HOST' } },
          },
          select: { id: true },
        });
        if (!port) {
          throw new BadRequestException(
            `Port ${point.device}/${point.port} not found`,
          );
        }
      }
      if (
        selector?.dstPort &&
        selector.protocol !== 'TCP' &&
        selector.protocol !== 'UDP'
      ) {
        throw new BadRequestException('A destination port needs TCP or UDP');
      }
      const cleanSelector = selector && {
        ...(selector.ipSrc && { ipSrc: selector.ipSrc }),
        ...(selector.ipDst && { ipDst: selector.ipDst }),
        ...(selector.protocol && { protocol: selector.protocol }),
        ...(selector.dstPort && { dstPort: selector.dstPort }),
      };
      return {
        type: input.type,
        ingressPoint: { device: ingressPoint.device, port: ingressPoint.port },
        egressPoint: { device: egressPoint.device, port: egressPoint.port },
        ...(cleanSelector &&
          Object.keys(cleanSelector).length > 0 && { selector: cleanSelector }),
        priority,
      };
    }

    throw new BadRequestException('Unknown intent type');
  }

  private publish(row: RoutingPolicy, message: string) {
    this.events.publish({
      type: 'policy.status',
      severity: 'info',
      message,
      data: {
        policyId: row.id,
        isApplied: row.isApplied,
        intentKey: row.intentKey,
      },
    });
  }

  private async fromOnos<T>(
    read: () => Promise<T>,
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    try {
      return { ok: true, value: await read() };
    } catch (e) {
      if (
        e instanceof ServiceUnavailableException ||
        e instanceof BadGatewayException
      ) {
        return { ok: false };
      }
      throw e;
    }
  }

  private async getOrThrow(id: string): Promise<PolicyRow> {
    const row = await this.prisma.routingPolicy.findUnique({
      where: { id },
      include: withCreator,
    });
    if (!row) throw new NotFoundException(`Policy ${id} not found`);
    return row;
  }
}

const ONOS_STATES: readonly IntentState[] = [
  'INSTALLED',
  'INSTALLING',
  'COMPILING',
  'RECOMPILING',
  'WITHDRAWING',
  'WITHDRAWN',
  'FAILED',
  'CORRUPT',
];

function asIntentState(state: string | null | undefined): IntentState {
  if (!state) return 'MISSING';
  return ONOS_STATES.find((s) => s === state) ?? 'UNKNOWN';
}

function toJson(payload: PolicyPayload): Prisma.InputJsonObject {
  return payload as unknown as Prisma.InputJsonObject;
}

function readPayload(row: RoutingPolicy): PolicyPayload {
  return row.payload as unknown as PolicyPayload;
}

function toResponse(row: PolicyRow, state: IntentState): RoutingPolicyResponse {
  return {
    ...row,
    intentType: row.intentType as IntentType,
    payload: readPayload(row),
    state,
  };
}
