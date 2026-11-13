import { z } from 'zod';

export const floorPlanMetaSchema = z.object({
  title: z.string().trim().min(1, 'Вкажіть назву').max(255),
  building: z.string().trim().max(255),
  floorLevel: z.coerce
    .number()
    .int('Ціле число')
    .min(-10, 'Не менше −10')
    .max(200, 'Не більше 200'),
});

export type FloorPlanMetaInput = z.input<typeof floorPlanMetaSchema>;
export type FloorPlanMetaValues = z.output<typeof floorPlanMetaSchema>;
