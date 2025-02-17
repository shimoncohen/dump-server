import { Repository, QueryFailedError } from 'typeorm';
import { faker } from '@faker-js/faker';
import jsLogger from '@map-colonies/js-logger';
import { DumpMetadata as IDumpMetadata, DumpMetadataResponse } from '../../../../src/dumpMetadata/models/dumpMetadata';
import { DumpMetadata } from '../../../../src/dumpMetadata/DAL/typeorm/dumpMetadata';
import { DumpMetadataManager } from '../../../../src/dumpMetadata/models/dumpMetadataManager';
import {
  createFakeDumpMetadata,
  BOTTOM_FROM,
  TOP_TO,
  getBaseFilterQueryParams,
  getMockObjectStorageConfig,
  convertFakesToResponses,
  convertFakeToResponse,
  sortByOrderFilter,
} from '../../../helpers';
import { DumpNotFoundError } from '../../../../src/dumpMetadata/models/errors';
import { DumpMetadataFilter } from '../../../../src/dumpMetadata/models/dumpMetadataFilter';
import { getDefaultFilter } from '../../helpers';
import { DumpNameAlreadyExistsError } from '../../../../src/common/errors';

let dumpMetadataManager: DumpMetadataManager;

describe('dumpMetadataManager', () => {
  let find: jest.Mock;
  let findOneBy: jest.Mock;
  let findOne: jest.Mock;
  let insert: jest.Mock;
  let repository: Repository<DumpMetadata>;

  beforeEach(function () {
    find = jest.fn();
    findOneBy = jest.fn();
    findOne = jest.fn();
    insert = jest.fn();

    repository = { find, findOneBy, findOne, insert } as unknown as Repository<DumpMetadata>;
    dumpMetadataManager = new DumpMetadataManager(repository, jsLogger({ enabled: false }), getMockObjectStorageConfig(true));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#getDumpMetadataByFilter', () => {
    it.each([
      [BOTTOM_FROM, undefined],
      [undefined, TOP_TO],
      [BOTTOM_FROM, TOP_TO],
      [undefined, undefined],
    ])(
      'should return the filtered dumpsMetadata in any case of filtering by from(0), to(1), both(2) or none(3) (%#)',
      async function (from: Date | undefined, to: Date | undefined) {
        const dumpsMetadata = [createFakeDumpMetadata(), createFakeDumpMetadata(), createFakeDumpMetadata()];
        const filter: DumpMetadataFilter = { ...getBaseFilterQueryParams(), from, to };

        find.mockReturnValue(sortByOrderFilter(dumpsMetadata, filter.sort));

        const getByFilterPromise = dumpMetadataManager.getDumpsMetadataByFilter(filter);

        const dumpsMetadataResponses: DumpMetadataResponse[] = convertFakesToResponses(dumpsMetadata, true);

        await expect(getByFilterPromise).resolves.toEqual(sortByOrderFilter(dumpsMetadataResponses, filter.sort));
      }
    );
    it.each([
      [BOTTOM_FROM, undefined],
      [undefined, TOP_TO],
      [BOTTOM_FROM, TOP_TO],
      [undefined, undefined],
    ])(
      'should return the correct response with no projectId set in url filtering by from(0), to(1), both(2) or none(3) (%#)',
      async function (from: Date | undefined, to: Date | undefined) {
        const dumpMetadataManagerNoProjectId = new DumpMetadataManager(repository, jsLogger({ enabled: false }), getMockObjectStorageConfig(false));
        const dumpsMetadata = [createFakeDumpMetadata(), createFakeDumpMetadata(), createFakeDumpMetadata()];
        const filter: DumpMetadataFilter = { ...getBaseFilterQueryParams(), from, to };

        find.mockReturnValue(sortByOrderFilter(dumpsMetadata, filter.sort));

        const getByFilterPromise = dumpMetadataManagerNoProjectId.getDumpsMetadataByFilter(filter);

        const dumpsMetadataResponses: DumpMetadataResponse[] = convertFakesToResponses(dumpsMetadata, false);

        await expect(getByFilterPromise).resolves.toEqual(sortByOrderFilter(dumpsMetadataResponses, filter.sort));
      }
    );

    it('should return the empty array response', async function () {
      const dumpsMetadata: IDumpMetadata[] = [];
      find.mockReturnValue(dumpsMetadata);

      const getByFilterPromise = dumpMetadataManager.getDumpsMetadataByFilter(getDefaultFilter());

      await expect(getByFilterPromise).resolves.toEqual([]);
    });

    it('should reject on DB error', async () => {
      find.mockRejectedValue(new QueryFailedError('', undefined, new Error()));

      const getByFilterPromise = dumpMetadataManager.getDumpsMetadataByFilter(getDefaultFilter());

      await expect(getByFilterPromise).rejects.toThrow(QueryFailedError);
    });
  });

  describe('#getDumpMetadataById', () => {
    it('should return the dumpMetadata', async function () {
      const dumpMetadata = createFakeDumpMetadata();
      findOneBy.mockResolvedValue(dumpMetadata);

      const getPromise = dumpMetadataManager.getDumpMetadataById(dumpMetadata.id);

      const dumpMetadataResponse = convertFakeToResponse(dumpMetadata);

      await expect(getPromise).resolves.toEqual(dumpMetadataResponse);
    });

    it('should return the dumpMetadata without projectId', async function () {
      const dumpMetadata = createFakeDumpMetadata();
      findOneBy.mockResolvedValue(dumpMetadata);

      const dumpMetadataManagerWithoutProjectId = new DumpMetadataManager(
        repository,
        jsLogger({ enabled: false }),
        getMockObjectStorageConfig(false)
      );
      const getPromise = dumpMetadataManagerWithoutProjectId.getDumpMetadataById(dumpMetadata.id);

      const dumpMetadataResponse = convertFakeToResponse(dumpMetadata, false);

      await expect(getPromise).resolves.toEqual(dumpMetadataResponse);
    });

    it('should throw DumpNotFoundError if dumpMetadata with the given id was not found', async () => {
      findOneBy.mockReturnValue(undefined);
      const dumpMetadata = createFakeDumpMetadata();

      const getPromise = dumpMetadataManager.getDumpMetadataById(dumpMetadata.id);

      await expect(getPromise).rejects.toThrow(DumpNotFoundError);
    });

    it('should reject on DB error', async () => {
      findOneBy.mockRejectedValue(new QueryFailedError('', undefined, new Error()));

      const getPromise = dumpMetadataManager.getDumpMetadataById(faker.datatype.uuid());

      await expect(getPromise).rejects.toThrow(QueryFailedError);
    });
  });

  describe('#createDumpMetadata', () => {
    it('should resolves without errors', async () => {
      findOne.mockResolvedValue(undefined);
      const dumpMetadata = createFakeDumpMetadata();
      const { id, ...rest } = dumpMetadata;
      insert.mockResolvedValue({ identifiers: [id] });
      const createPromise = dumpMetadataManager.createDumpMetadata(rest);

      await expect(createPromise).resolves.not.toThrow();
    });

    it('should reject if a dump name already exists on the bucket', async () => {
      const dumpMetadata = createFakeDumpMetadata();
      findOne.mockResolvedValue(dumpMetadata);
      const { id, ...rest } = dumpMetadata;
      const createPromise = dumpMetadataManager.createDumpMetadata(rest);

      await expect(createPromise).rejects.toThrow(DumpNameAlreadyExistsError);
    });

    it('should reject on DB error', async () => {
      findOne.mockResolvedValue(undefined);
      insert.mockRejectedValue(new QueryFailedError('', undefined, new Error()));

      const dumpMetadata = createFakeDumpMetadata();
      const { id, ...rest } = dumpMetadata;
      const createPromise = dumpMetadataManager.createDumpMetadata(rest);

      await expect(createPromise).rejects.toThrow(QueryFailedError);
    });
  });
});
