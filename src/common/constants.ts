import { readPackageJsonSync } from '@map-colonies/read-pkg';

export const DEFAULT_SERVER_PORT = 80;
export const DB_HEALTHCHECK_TIMEOUT_MS = 5000;
export const SERVICE_NAME = readPackageJsonSync().name ?? 'unknown_service';

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/, /^.*\/metrics.*/];

/* eslint-disable @typescript-eslint/naming-convention */
export const SERVICES = {
  LOGGER: Symbol('ILogger'),
  CONFIG: Symbol('IConfig'),
  TRACER: Symbol('TRACER'),
  METRICS: Symbol('Metrics'),
  HEALTHCHECK: Symbol('HealthCheck'),
  OBJECT_STORAGE: Symbol('IObjectStorage'),
  CLEANUP_REGISTRY: Symbol('CLEANUP_REGISTRY'),
} satisfies Record<string, symbol>;
/* eslint-enable @typescript-eslint/naming-convention */

export const DATA_SOURCE_PROVIDER = Symbol('dataSourceProvider');

export const ON_SIGNAL = Symbol('onSignal');

export const DB_TIMEOUT = 5000;

export const NAME_LENGTH_LIMIT = 100;

export const BUCKET_NAME_LENGTH_LIMIT = 63;

export const BUCKET_NAME_MIN_LENGTH_LIMIT = 3;

export const DESCRIPTION_LENGTH_LIMIT = 256;
