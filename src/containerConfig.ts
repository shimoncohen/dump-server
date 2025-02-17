import { DependencyContainer, instancePerContainerCachingFactory } from 'tsyringe';
import { DataSource, Repository } from 'typeorm';
import { trace } from '@opentelemetry/api';
import { getOtelMixin, Metrics } from '@map-colonies/telemetry';
import jsLogger from '@map-colonies/js-logger';
import { metrics } from '@opentelemetry/api-metrics';
import { dumpMetadataRouterFactory, DUMP_METADATA_ROUTER_SYMBOL } from './dumpMetadata/routes/dumpMetadataRouter';
import { tracing } from './common/tracing';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { Services } from './common/constants';
import { DATA_SOURCE_PROVIDER, dataSourceFactory, getDbHealthCheckFunction } from './common/db';
import { ShutdownHandler } from './common/shutdownHandler';
import { DumpMetadata, DUMP_METADATA_REPOSITORY_SYMBOL } from './dumpMetadata/DAL/typeorm/dumpMetadata';
import { getConfig } from './common/config';

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

    const tracer = trace.getTracer('app');

    const objectStorageConfig = configInstance.get('objectStorage');

    const dependencies: InjectionObject<unknown>[] = [
      { token: Services.CONFIG, provider: { useValue: configInstance } },
      { token: Services.LOGGER, provider: { useValue: logger } },
      { token: Services.TRACER, provider: { useValue: tracer } },
      { token: Services.METER, provider: { useValue: metrics.getMeter('app') } },
      { token: Services.OBJECT_STORAGE, provider: { useValue: objectStorageConfig } },
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
        token: 'healthcheck',
        provider: { useFactory: (container): unknown => getDbHealthCheckFunction(container.resolve<DataSource>(DataSource)) },
      },
      {
        token: 'onSignal',
        provider: {
          useValue: {
            useValue: async (): Promise<void> => {
              await Promise.all([tracing.stop(), otelMetrics.stop(), shutdownHandler.onShutdown()]);
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
