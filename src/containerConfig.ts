import { DependencyContainer, instancePerContainerCachingFactory } from 'tsyringe';
import { DataSource, Repository } from 'typeorm';
import { trace } from '@opentelemetry/api';
import { getOtelMixin, Metrics } from '@map-colonies/telemetry';
import jsLogger from '@map-colonies/js-logger';
import { Registry } from 'prom-client';
import { dumpMetadataRouterFactory, DUMP_METADATA_ROUTER_SYMBOL } from './dumpMetadata/routes/dumpMetadataRouter';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { SERVICE_NAME, SERVICES } from './common/constants';
import { DATA_SOURCE_PROVIDER, dataSourceFactory, getDbHealthCheckFunction } from './common/db';
import { ShutdownHandler } from './common/shutdownHandler';
import { DumpMetadata, DUMP_METADATA_REPOSITORY_SYMBOL } from './dumpMetadata/DAL/typeorm/dumpMetadata';
import { getConfig } from './common/config';
import { getTracing } from './common/tracing';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const shutdownHandler = new ShutdownHandler();

  try {
    const configInstance = getConfig();

    const loggerConfig = configInstance.get('telemetry.logger');
    const logger = jsLogger({ ...loggerConfig, mixin: getOtelMixin() });

    const otelMetrics = new Metrics();
    otelMetrics.start();

    const tracer = trace.getTracer(SERVICE_NAME);
    const metricsRegistry = new Registry();

    const objectStorageConfig = configInstance.get('objectStorage');

    const dependencies: InjectionObject<unknown>[] = [
      { token: SERVICES.CONFIG, provider: { useValue: configInstance } },
      { token: SERVICES.LOGGER, provider: { useValue: logger } },
      { token: SERVICES.TRACER, provider: { useValue: tracer } },
      { token: SERVICES.METRICS, provider: { useValue: metricsRegistry } },
      { token: SERVICES.OBJECT_STORAGE, provider: { useValue: objectStorageConfig } },
      {
        token: DATA_SOURCE_PROVIDER,
        provider: { useFactory: instancePerContainerCachingFactory(dataSourceFactory) },
        postInjectionHook: async (deps: DependencyContainer): Promise<void> => {
          const dataSource = deps.resolve<DataSource>(DATA_SOURCE_PROVIDER);
          shutdownHandler.addFunction(dataSource.destroy.bind(dataSource));
          await dataSource.initialize();
        },
      },
      {
        token: DUMP_METADATA_REPOSITORY_SYMBOL,
        provider: {
          useFactory: (deps: DependencyContainer): Repository<DumpMetadata> => {
            const dataSource = deps.resolve<DataSource>(DATA_SOURCE_PROVIDER);
            const repository = dataSource.getRepository(DumpMetadata);
            return repository;
          },
        },
      },
      { token: DUMP_METADATA_ROUTER_SYMBOL, provider: { useFactory: dumpMetadataRouterFactory } },
      {
        token: SERVICES.HEALTHCHECK,
        provider: { useFactory: (container): unknown => getDbHealthCheckFunction(container.resolve<DataSource>(DataSource)) },
      },
      {
        token: 'onSignal',
        provider: {
          useValue: {
            useValue: async (): Promise<void> => {
              await Promise.all([getTracing().stop(), otelMetrics.stop(), shutdownHandler.onShutdown()]);
            },
          },
        },
      },
    ];

    const container = await registerDependencies(dependencies, options?.override, options?.useChild);
    return container;
  } catch (error) {
    await shutdownHandler.onShutdown();
    throw error;
  }
};
