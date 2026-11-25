import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  getSchemaPath,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { ApiErrorDto } from './common/swagger/api-error.dto.js';

export const SWAGGER_PATH = 'api/docs';

const DESCRIPTION = `
Remote administration of an SDN network (ONOS) on building floor plans.

**Authentication.** \`POST /api/auth/login\` returns a JWT; send it as
\`Authorization: Bearer <token>\` (the *Authorize* button above).
Endpoints with a 403 response are allowed only for the \`ADMIN\` role; the
rest are open to any signed-in user (\`ADMIN\` or \`OPERATOR\`).

**Errors.** Every error has the \`ApiErrorDto\` shape.

**Realtime.** Socket.IO namespace \`/realtime\`; the token goes in
\`auth.token\` of the handshake. Client → server: \`floor:join\` /
\`floor:leave\` (floor plan id) and \`dashboard:join\` /
\`dashboard:leave\`. Server → client, to the room of the plan:
\`device:moved\`, \`device:unplaced\`, \`link:updated\`,
\`link:deleted\`; \`system:event\` (device, port, link and policy status
changes) goes to the dashboard room and to the plans it concerns. A request
sent with the \`x-socket-id\` header is not echoed back to that socket.
`;

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('PhysNet API')
    .setDescription(DESCRIPTION.trim())
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiErrorDto],
  });
  addCommonErrors(document);
  return document;
}

const ONOS_OPERATIONS = new Set([
  'post /api/policies/{id}/apply',
  'post /api/policies/{id}/withdraw',
  'delete /api/policies/{id}',
  'patch /api/ports/{id}',
  'post /api/sync',
]);

const CONFLICTS: Record<string, string> = {
  'post /api/administrators': 'The email is already in use',
  'patch /api/administrators/{id}': 'The email is already in use',
  'delete /api/administrators/{id}':
    'The administrator still owns floor plans or policies',
  'delete /api/devices/{id}': 'ONOS still reports the device (not OFFLINE)',
  'post /api/floor-plans/{id}/links':
    'One of the ports already has a cable on this plan',
  'delete /api/links/{id}': 'The cable mirrors a link discovered by ONOS',
  'patch /api/policies/{id}': 'The policy is applied; withdraw it first',
  'post /api/policies/{id}/apply': 'The policy is already applied',
  'post /api/policies/{id}/withdraw': 'The policy is not applied',
  'post /api/sync': 'A synchronisation is already running',
};

function addCommonErrors(document: OpenAPIObject) {
  const error = (description: string) => ({
    description,
    content: {
      'application/json': { schema: { $ref: getSchemaPath(ApiErrorDto) } },
    },
  });
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = item[method];
      if (!operation) continue;
      const responses = operation.responses;
      const add = (code: string, description: string) => {
        responses[code] ??= error(description);
      };
      if (operation.requestBody || operation.parameters?.length) {
        add('400', 'Validation failed (the message lists the problems)');
      }
      if (path.includes('{id}')) add('404', 'Not found');
      const conflict = CONFLICTS[`${method} ${path}`];
      if (conflict) add('409', conflict);
      if (ONOS_OPERATIONS.has(`${method} ${path}`)) {
        add('502', 'ONOS rejected the request');
        add('503', 'ONOS is unreachable');
      }
    }
  }
}

export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup(SWAGGER_PATH, app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: `${SWAGGER_PATH}/openapi.json`,
  });
}
