import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BUCKET_NAME_LENGTH_LIMIT, DESCRIPTION_LENGTH_LIMIT, NAME_LENGTH_LIMIT } from '../../../common/constants';
import { DumpMetadata as IDumpMetadata } from '../../models/dumpMetadata';

@Entity()
export class DumpMetadata implements IDumpMetadata {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column({ length: NAME_LENGTH_LIMIT, type: 'character varying' })
  public name!: string;

  @Column({ length: BUCKET_NAME_LENGTH_LIMIT, type: 'character varying' })
  public bucket!: string;

  @Index('Timestamp-idx')
  @Column({ type: 'timestamp without time zone' })
  public timestamp!: Date;

  @Column({ nullable: true, length: DESCRIPTION_LENGTH_LIMIT, type: 'character varying' })
  public description!: string;

  @Column({ name: 'sequence_number', type: 'integer', nullable: true })
  public sequenceNumber!: number;
}

export const DUMP_METADATA_REPOSITORY_SYMBOL = Symbol('dumpMetadataRepository');
