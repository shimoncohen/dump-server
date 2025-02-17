import { vectorReplicaServerV1Type } from "@map-colonies/schemas";

export type DbCommonConfig = Pick<vectorReplicaServerV1Type, 'db'>['db'];

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export interface IObjectStorageConfig {
  protocol: string;
  host: string;
  projectId?: string;
  port: string;
}
