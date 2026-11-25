import {
  BadGatewayException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { SyncStatus, SyncSummary } from '@physnet/shared';
import type { Env } from '../config/env.js';
import { SystemEventsService } from '../events/system-events.service.js';
import {
  HOST_PORT_NUMBER,
  mapSnapshot,
  type MappedLink,
  type MappedTopology,
} from '../onos/onos.mapper.js';
import { OnosService } from '../onos/onos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TopologyEventsService } from '../realtime/topology-events.service.js';

const INTERVAL_NAME = 'onos-topology-sync';

const noop = () => undefined;

@Injectable()
export class TopologySyncService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TopologySyncService.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private inFlight: Promise<SyncSummary> | null = null;
  private queued: Promise<void> | null = null;
  private status: SyncStatus;

  constructor(
    private readonly prisma: PrismaService,
    private readonly onos: OnosService,
    private readonly events: SystemEventsService,
    private readonly topologyEvents: TopologyEventsService,
    private readonly scheduler: SchedulerRegistry,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('ONOS_SYNC_ENABLED', { infer: true });
    this.intervalMs = config.get('ONOS_POLL_INTERVAL_MS', { infer: true });
    this.status = {
      enabled: this.enabled,
      intervalMs: this.intervalMs,
      running: false,
      controllerReachable: null,
      lastRunAt: null,
      lastSuccessAt: null,
      lastError: null,
      lastSummary: null,
    };
  }

  onApplicationBootstrap() {
    if (!this.enabled) {
      this.logger.log(
        'Periodic ONOS sync is disabled (ONOS_SYNC_ENABLED=false)',
      );
      return;
    }
    const tick = () => void this.syncSafely();
    this.scheduler.addInterval(
      INTERVAL_NAME,
      setInterval(tick, this.intervalMs),
    );
    tick();
  }

  onApplicationShutdown() {
    if (this.scheduler.doesExist('interval', INTERVAL_NAME)) {
      this.scheduler.deleteInterval(INTERVAL_NAME);
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status, running: this.inFlight !== null };
  }

  requestSync(): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    const current = this.inFlight;
    if (!current) return this.syncSafely();
    this.queued ??= current.then(noop, noop).then(() => {
      this.queued = null;
      return this.syncSafely();
    });
    return this.queued;
  }

  syncSafely(): Promise<void> {
    if (this.inFlight) return this.inFlight.then(noop, noop);
    return this.sync().then(noop, noop);
  }

  async sync(): Promise<SyncSummary> {
    if (this.inFlight) {
      throw new Error('Synchronisation is already running');
    }
    const run = this.run();
    this.inFlight = run;
    try {
      return await run;
    } finally {
      this.inFlight = null;
    }
  }

  private async run(): Promise<SyncSummary> {
    this.status.lastRunAt = new Date().toISOString();
    try {
      const topology = mapSnapshot(await this.onos.getSnapshot());
      this.setReachable(true);
      const summary = await this.apply(topology);
      this.status.lastSuccessAt = new Date().toISOString();
      this.status.lastError = null;
      this.status.lastSummary = summary;
      return summary;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.status.lastError = message;
      if (
        e instanceof ServiceUnavailableException ||
        e instanceof BadGatewayException
      ) {
        this.setReachable(false, message);
      } else {
        this.logger.error(
          `Sync failed: ${message}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
      throw e;
    }
  }

  private setReachable(reachable: boolean, reason?: string) {
    const previous = this.status.controllerReachable;
    this.status.controllerReachable = reachable;
    if (previous === reachable) return;
    if (reachable) {
      this.logger.log('ONOS controller is reachable');
      if (previous === false) {
        this.events.publish({
          type: 'controller.status',
          severity: 'info',
          message: 'Зв’язок із контролером ONOS відновлено',
        });
      }
    } else {
      this.logger.warn(`ONOS controller is not available: ${reason}`);
      this.events.publish({
        type: 'controller.status',
        severity: 'critical',
        message: 'Контролер ONOS недоступний',
        data: { reason },
      });
    }
  }

  private async apply(topology: MappedTopology): Promise<SyncSummary> {
    const summary: SyncSummary = {
      devicesCreated: 0,
      devicesUpdated: 0,
      devicesWentOffline: 0,
      portsUpserted: 0,
      linksCreated: 0,
      linksUpdated: 0,
      linksWentDown: 0,
      linksRemoved: 0,
    };

    const placements = await this.placementsByDevice();
    const existing = new Map(
      (
        await this.prisma.networkDevice.findMany({
          select: {
            id: true,
            onosDeviceId: true,
            status: true,
            name: true,
            ipAddress: true,
            macAddress: true,
          },
        })
      ).map((d) => [d.onosDeviceId, d]),
    );

    for (const device of topology.devices) {
      const { ports, ...fields } = device;
      const before = existing.get(fields.onosDeviceId);
      const saved = await this.prisma.networkDevice.upsert({
        where: { onosDeviceId: fields.onosDeviceId },
        create: fields,
        update: {
          ...(before && isGeneratedName(before) && { name: fields.name }),
          deviceType: fields.deviceType,
          ipAddress: fields.ipAddress,
          macAddress: fields.macAddress,
          status: fields.status,
        },
        select: { id: true },
      });
      const floorPlanIds = placements.get(saved.id) ?? [];

      if (!before) {
        summary.devicesCreated++;
        this.events.publish({
          type: 'device.discovered',
          severity: 'info',
          message: `Виявлено новий пристрій ${fields.name}`,
          deviceId: saved.id,
          data: {
            onosDeviceId: fields.onosDeviceId,
            deviceType: fields.deviceType,
          },
        });
      } else {
        summary.devicesUpdated++;
        if (before.status !== fields.status) {
          this.events.publish({
            type: 'device.status',
            severity: fields.status === 'ACTIVE' ? 'info' : 'critical',
            message: `${before.name}: ${fields.status === 'ACTIVE' ? 'знову в мережі' : 'недоступний'}`,
            deviceId: saved.id,
            floorPlanIds,
            data: { from: before.status, to: fields.status },
          });
        }
      }

      summary.portsUpserted += await this.syncPorts(
        saved.id,
        before?.name ?? fields.name,
        ports,
        floorPlanIds,
      );
    }

    const reported = new Set(topology.devices.map((d) => d.onosDeviceId));
    for (const [onosDeviceId, d] of existing) {
      if (reported.has(onosDeviceId) || d.status === 'OFFLINE') continue;
      await this.prisma.networkDevice.update({
        where: { id: d.id },
        data: { status: 'OFFLINE' },
      });
      summary.devicesWentOffline++;
      this.events.publish({
        type: 'device.status',
        severity: 'critical',
        message: `${d.name}: зник із топології контролера`,
        deviceId: d.id,
        floorPlanIds: placements.get(d.id) ?? [],
        data: { from: d.status, to: 'OFFLINE' },
      });
    }

    await this.removeOffPlanLinks(summary);
    await this.syncLinks(topology.links, placements, summary);
    return summary;
  }

  private async removeOffPlanLinks(summary: SyncSummary): Promise<void> {
    const removed = await this.prisma.$queryRaw<
      { id: string; floor_plan_id: string }[]
    >`
      DELETE FROM network_links l
      USING device_ports s, device_ports d
      WHERE s.id = l.source_port_id AND d.id = l.destination_port_id
        AND NOT (
          EXISTS (SELECT 1 FROM spatial_coordinates c
                  WHERE c.floor_plan_id = l.floor_plan_id
                    AND c.device_id = s.device_id)
          AND EXISTS (SELECT 1 FROM spatial_coordinates c
                      WHERE c.floor_plan_id = l.floor_plan_id
                        AND c.device_id = d.device_id)
        )
      RETURNING l.id, l.floor_plan_id`;
    for (const link of removed) {
      summary.linksRemoved++;
      this.topologyEvents.linkDeleted({
        floorPlanId: link.floor_plan_id,
        linkId: link.id,
      });
    }
  }

  private async syncPorts(
    deviceId: string,
    deviceName: string,
    ports: MappedTopology['devices'][number]['ports'],
    floorPlanIds: string[],
  ): Promise<number> {
    const before = new Map(
      (
        await this.prisma.devicePort.findMany({
          where: { deviceId },
          select: { portNumber: true, isEnabled: true },
        })
      ).map((p) => [p.portNumber, p.isEnabled]),
    );

    for (const port of ports) {
      const saved = await this.prisma.devicePort.upsert({
        where: {
          deviceId_portNumber: { deviceId, portNumber: port.portNumber },
        },
        create: { deviceId, ...port },
        update: {
          macAddress: port.macAddress,
          ipAddress: port.ipAddress,
          speedMbps: port.speedMbps,
          isEnabled: port.isEnabled,
        },
        select: { id: true },
      });
      const was = before.get(port.portNumber);
      if (was !== undefined && was !== port.isEnabled) {
        this.events.publish({
          type: 'port.status',
          severity: port.isEnabled ? 'info' : 'warning',
          message: `${deviceName}, порт ${port.portNumber}: ${port.isEnabled ? 'увімкнено' : 'вимкнено'}`,
          deviceId,
          portId: saved.id,
          floorPlanIds,
          data: { portNumber: port.portNumber, isEnabled: port.isEnabled },
        });
      }
    }
    return ports.length;
  }

  private async syncLinks(
    links: MappedLink[],
    placements: Map<string, string[]>,
    summary: SyncSummary,
  ): Promise<void> {
    const ports = await this.prisma.devicePort.findMany({
      select: {
        id: true,
        portNumber: true,
        deviceId: true,
        device: { select: { onosDeviceId: true, name: true } },
      },
    });
    const portByKey = new Map(
      ports.map((p) => [`${p.device.onosDeviceId}/${p.portNumber}`, p]),
    );
    const portById = new Map(ports.map((p) => [p.id, p]));
    const label = (x?: (typeof ports)[number], y?: (typeof ports)[number]) =>
      [x, y]
        .map((p) =>
          !p
            ? '?'
            : p.portNumber === HOST_PORT_NUMBER
              ? p.device.name
              : `${p.device.name}/${p.portNumber}`,
        )
        .join(' ↔ ');

    const stored = await this.prisma.networkLink.findMany({
      select: {
        id: true,
        onosLinkId: true,
        sourcePortId: true,
        destinationPortId: true,
        status: true,
        floorPlanId: true,
      },
    });
    const pairKey = (x: string, y: string) => [x, y].sort().join('|');
    const storedByPair = new Map<string, typeof stored>();
    for (const l of stored) {
      const k = pairKey(l.sourcePortId, l.destinationPortId);
      storedByPair.set(k, [...(storedByPair.get(k) ?? []), l]);
    }

    const seen = new Set<string>();
    const linkedPorts = new Set<string>();
    for (const link of links) {
      const a = portByKey.get(`${link.a.onosDeviceId}/${link.a.portNumber}`);
      const b = portByKey.get(`${link.b.onosDeviceId}/${link.b.portNumber}`);
      if (!a || !b) continue;
      linkedPorts.add(a.id).add(b.id);

      const matches = storedByPair.get(pairKey(a.id, b.id)) ?? [];
      for (const m of matches) {
        seen.add(m.id);
        if (m.status === link.status && m.onosLinkId === link.onosLinkId)
          continue;
        await this.prisma.networkLink.update({
          where: { id: m.id },
          data: { status: link.status, onosLinkId: link.onosLinkId },
        });
        summary.linksUpdated++;
        if (m.status !== link.status)
          this.publishLinkStatus(
            m.id,
            m.floorPlanId,
            link,
            m.status,
            label(a, b),
          );
      }

      const drawnOn = new Set(matches.map((m) => m.floorPlanId));
      const plansA = placements.get(a.deviceId) ?? [];
      const plansB = new Set(placements.get(b.deviceId) ?? []);
      for (const floorPlanId of plansA.filter(
        (p) => plansB.has(p) && !drawnOn.has(p),
      )) {
        const created = await this.createLinkIfPlaced(
          {
            onosLinkId: link.onosLinkId,
            sourcePortId: a.id,
            destinationPortId: b.id,
            floorPlanId,
            status: link.status,
          },
          [a.deviceId, b.deviceId],
        );
        if (!created) continue;
        seen.add(created.id);
        summary.linksCreated++;
        this.events.publish({
          type: 'link.created',
          severity: 'info',
          message: `Нова лінія ${label(a, b)}`,
          linkId: created.id,
          floorPlanIds: [floorPlanId],
          data: { onosLinkId: link.onosLinkId },
        });
      }
    }

    for (const l of stored) {
      if (seen.has(l.id) || !l.onosLinkId) continue;
      if (
        linkedPorts.has(l.sourcePortId) ||
        linkedPorts.has(l.destinationPortId)
      ) {
        await this.prisma.networkLink.deleteMany({ where: { id: l.id } });
        summary.linksRemoved++;
        this.topologyEvents.linkDeleted({
          floorPlanId: l.floorPlanId,
          linkId: l.id,
        });
        continue;
      }
      if (l.status === 'DOWN') continue;
      await this.prisma.networkLink.update({
        where: { id: l.id },
        data: { status: 'DOWN' },
      });
      summary.linksWentDown++;
      this.events.publish({
        type: 'link.status',
        severity: 'critical',
        message: `Лінія ${label(portById.get(l.sourcePortId), portById.get(l.destinationPortId))} розірвана`,
        linkId: l.id,
        floorPlanIds: [l.floorPlanId],
        data: { from: l.status, to: 'DOWN', onosLinkId: l.onosLinkId },
      });
    }
  }

  private publishLinkStatus(
    linkId: string,
    floorPlanId: string,
    link: MappedLink,
    from: string,
    label: string,
  ) {
    this.events.publish({
      type: 'link.status',
      severity: link.status === 'ACTIVE' ? 'info' : 'critical',
      message: `Лінія ${label} ${link.status === 'ACTIVE' ? 'відновлена' : 'розірвана'}`,
      linkId,
      floorPlanIds: [floorPlanId],
      data: { from, to: link.status, onosLinkId: link.onosLinkId },
    });
  }

  private createLinkIfPlaced(
    data: {
      onosLinkId: string;
      sourcePortId: string;
      destinationPortId: string;
      floorPlanId: string;
      status: string;
    },
    [deviceA, deviceB]: [string, string],
  ): Promise<{ id: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      const placed = await tx.$queryRaw<{ device_id: string }[]>`
        SELECT device_id FROM spatial_coordinates
        WHERE floor_plan_id = ${data.floorPlanId}::uuid
          AND device_id IN (${deviceA}::uuid, ${deviceB}::uuid)
        FOR SHARE`;
      if (new Set(placed.map((p) => p.device_id)).size < 2) return null;
      return tx.networkLink.create({ data, select: { id: true } });
    });
  }

  private async placementsByDevice(): Promise<Map<string, string[]>> {
    const rows = await this.prisma.spatialCoordinate.findMany({
      select: { deviceId: true, floorPlanId: true },
    });
    const map = new Map<string, string[]>();
    for (const r of rows)
      map.set(r.deviceId, [...(map.get(r.deviceId) ?? []), r.floorPlanId]);
    return map;
  }
}

function isGeneratedName(d: {
  name: string;
  onosDeviceId: string;
  ipAddress: string | null;
  macAddress: string | null;
}): boolean {
  return [d.onosDeviceId, d.ipAddress, d.macAddress].includes(d.name);
}
