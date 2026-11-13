import { NotFoundException } from '@nestjs/common';
import { FloorPlansService } from './floor-plans.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StorageService } from '../storage/storage.service.js';

const plan = {
  id: 'p1',
  title: 'Floor 3',
  building: 'B18',
  floorLevel: 3,
  imageUrl: 'floor-plans/1-x.png',
  scale: 1,
  width: 100,
  height: 50,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup() {
  const floorPlan = {
    create: vi.fn().mockResolvedValue(plan),
    findUnique: vi.fn().mockResolvedValue(plan),
    findMany: vi.fn(),
    delete: vi.fn().mockResolvedValue(plan),
    update: vi.fn(),
  };
  const storage = {
    upload: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://signed/url'),
  };
  const service = new FloorPlansService(
    { floorPlan } as unknown as PrismaService,
    storage as unknown as StorageService,
  );
  return { service, floorPlan, storage };
}

const file = {
  buffer: Buffer.from('x'),
  mimeType: 'image/png',
  extension: 'png',
  width: 100,
  height: 50,
};

describe('FloorPlansService', () => {
  it('stores the object key and returns a presigned URL', async () => {
    const { service, floorPlan, storage } = setup();
    const res = await service.create({ title: 'Floor 3' }, file, 'u1');

    const key = storage.upload.mock.calls[0][0].key as string;
    expect(key).toMatch(/^floor-plans\/\d+-[0-9a-f-]{36}\.png$/);
    expect(floorPlan.create.mock.calls[0][0].data).toMatchObject({
      imageUrl: key,
      width: 100,
      height: 50,
      building: '',
      floorLevel: 0,
      createdBy: 'u1',
    });
    expect(res.imageUrl).toBe('https://signed/url');
  });

  it('removes the uploaded object when the DB insert fails', async () => {
    const { service, floorPlan, storage } = setup();
    floorPlan.create.mockRejectedValueOnce(new Error('db down'));

    await expect(service.create({ title: 'x' }, file, 'u1')).rejects.toThrow(
      'db down',
    );
    expect(storage.delete).toHaveBeenCalledWith({
      key: storage.upload.mock.calls[0][0].key,
    });
  });

  it('deletes the record and then its image', async () => {
    const { service, floorPlan, storage } = setup();
    await service.remove('p1');
    expect(floorPlan.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(storage.delete).toHaveBeenCalledWith({ key: plan.imageUrl });
  });

  it('throws 404 for an unknown plan', async () => {
    const { service, floorPlan } = setup();
    floorPlan.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('groups floors by building', async () => {
    const { service, floorPlan } = setup();
    floorPlan.findMany.mockResolvedValueOnce([
      { id: 'a', title: 'F1', building: 'B1', floorLevel: 1 },
      { id: 'b', title: 'F2', building: 'B1', floorLevel: 2 },
      { id: 'c', title: 'F1', building: 'B2', floorLevel: 1 },
    ]);
    const res = await service.buildings();
    expect(res).toEqual([
      {
        building: 'B1',
        floors: [
          { id: 'a', title: 'F1', floorLevel: 1 },
          { id: 'b', title: 'F2', floorLevel: 2 },
        ],
      },
      { building: 'B2', floors: [{ id: 'c', title: 'F1', floorLevel: 1 }] },
    ]);
  });
});
