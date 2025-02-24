import { DataSource } from 'typeorm';
import { getConfig, initConfig } from '../../src/common/config';
import { createDataSourceOptions } from '../../src/common/db';
import { DumpMetadata } from '../../src/dumpMetadata/DAL/typeorm/dumpMetadata';

export default async (): Promise<void> => {
  await initConfig(true);

  const config = getConfig();
  const dbConfig = config.get('db');
  const dataSource = new DataSource(createDataSourceOptions(dbConfig));
  await dataSource.initialize();

  const entityRepository = dataSource.getRepository(DumpMetadata);
  await entityRepository.clear();

  await dataSource.destroy();
  return;
};
