import { eq, inArray, sql, Table, Column } from 'drizzle-orm';
import { BaseRepository, PaginatedResult } from './base.repository.js';
import type { ZodType } from 'zod';
import {
  isZodError,
  isUniqueConstraintError,
  extractDuplicateField,
  isTransientError,
} from '../lib/utils.js';
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
  DuplicateError,
} from '../Errors/global.error.js';
import pRetry from 'p-retry';
import { Logger } from '../lib/logger.js';
import { DataBase } from '../index.js';

/**
 * BaseAbstractRepository — a generic, reusable CRUD base class.
 *
 * Generic parameters:
 *   CreateDto  – the shape of data used to create a new record
 *   UpdateDto  – the shape of data used to update an existing record
 *   Entity     – the shape of a row returned from queries
 *   TDb        – the Drizzle database/transaction client type
 */
export abstract class BaseAbstractRepository<
  CreateDto,
  UpdateDto,
  Entity extends Record<string, unknown>,
> implements BaseRepository<CreateDto, UpdateDto, Entity> {
  // ─── ABSTRACT FIELDS (subclasses must define) ────────────
  protected abstract readonly table: Table;
  protected abstract readonly idColumn: Column;
  protected abstract readonly entityName: string;
  protected abstract readonly createSchema: ZodType<CreateDto>;
  protected abstract readonly updateSchema: ZodType<UpdateDto>;
  protected readonly NUMBER_OF_RETRIES: number = 3;

  constructor(
    protected readonly db: DataBase,
    protected readonly logger: Logger,
  ) {}

  // ─── HELPERS ─────────────────────────────────────────────

  /**
   * Run an async operation with automatic retry (up to 3 attempts).
   * `fn` must be a function returning a promise so pRetry can re-invoke
   * it on each attempt. Only retries errors classified as transient
   * (connection drops, timeouts) — validation, not-found, and
   * duplicate-key errors abort immediately via `shouldRetry`, since
   * retrying those wastes time and, for writes, can be unsafe.
   */
  protected async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    return pRetry(fn, {
      retries: this.NUMBER_OF_RETRIES
    });
  }

  // ─── CREATE ──────────────────────────────────────────────

  async create(data: CreateDto): Promise<Entity> {
    try {
      const parsed = await this.createSchema.parseAsync(data);
      const [result] = await this.executeWithRetry<any>(() =>
        this.db
          .insert(this.table)
          .values(parsed as any)
          .returning(),
      );
      if (!result) {
        throw new DatabaseError('create', this.entityName);
      }
      this.logger.info(`Created ${this.entityName}`, { data: result });
      return result as Entity;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      if (isZodError(error)) {
        throw new ValidationError(this.entityName, error.issues);
      }
      if (isUniqueConstraintError(error)) {
        throw new DuplicateError(this.entityName, extractDuplicateField(error));
      }
      this.logger.error(`Error creating ${this.entityName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('create', this.entityName, error);
    }
  }

  // ─── CREATE MANY (Cassandra-like batch — concurrent execution with status collection) ───

  async createMany(data: CreateDto[]): Promise<Entity[]> {
    try {
      const parsed = await Promise.all(
        data.map((item) => this.createSchema.parseAsync(item)),
      );
      const results = await this.db.transaction(async (tx) => {
        return await tx.insert(this.table).values(parsed).returning();
      });
      return results as Entity[];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      if (isZodError(error)) {
        throw new ValidationError(this.entityName, error.issues);
      }
      if (isUniqueConstraintError(error)) {
        throw new DuplicateError(this.entityName, extractDuplicateField(error));
      }
      this.logger.error(`Error creating many ${this.entityName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('createMany', this.entityName, error);
    }
  }

  // ─── UPDATE ──────────────────────────────────────────────

  async update(id: string, data: UpdateDto): Promise<Entity> {
    try {
      const parsed = await this.updateSchema.parseAsync(data);

      const [result] = await this.executeWithRetry<any>(() =>
        this.db
          .update(this.table)
          .set(parsed as any)
          .where(eq(this.idColumn, id))
          .returning(),
      );

      if (!result) {
        throw new NotFoundError(this.entityName, id);
      };
      this.logger.info(`Updated ${this.entityName}`, { id, data: result });
      return result as Entity;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (isZodError(error)) {
        throw new ValidationError(this.entityName, error.issues);
      }
      if (isUniqueConstraintError(error)) {
        throw new DuplicateError(this.entityName, extractDuplicateField(error));
      }
      this.logger.error(`Error updating ${this.entityName}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('update', this.entityName, error);
    }
  }

  // ─── UPDATE MANY ─────────────────────────────────────────

  async updateMany(data: { id: string; data: UpdateDto }[]): Promise<Entity[]> {
    try {
      const validated = await Promise.all(
        data.map(async (item) => ({
          id: item.id,
          parsed: await this.updateSchema.parseAsync(item.data),
        })),
      );

      const results = await this.db.transaction(async (tx) => {
        return await Promise.all(
          validated.map(async (item) => {
            const [result] = await tx
              .update(this.table)
              .set(item.parsed as any)
              .where(eq(this.idColumn, item.id))
              .returning();
            return result;
          }),
        );
      });
      return results.filter(Boolean) as Entity[];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      if (isZodError(error)) {
        throw new ValidationError(this.entityName, error.issues);
      }
      if (isUniqueConstraintError(error)) {
        throw new DuplicateError(this.entityName, extractDuplicateField(error));
      }
      this.logger.error(`Error updating many ${this.entityName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('updateMany', this.entityName, error);
    }
  }

  // ─── FIND BY ID ──────────────────────────────────────────

  async findById(id: string): Promise<Entity | null> {
    try {
      const [result] = await this.executeWithRetry<any>(() =>
        this.db.select().from(this.table).where(eq(this.idColumn, id)),
      );

      if (!result) {
        this.logger.info(`${this.entityName} not found`, { id });
        return null;
      }

      return result as Entity;
    } catch (error) {
      this.logger.error(`Error finding ${this.entityName}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('findById', this.entityName, error);
    }
  }

  // ─── FIND MANY (by IDs — no pagination) ──────────────────

  async findMany(ids: string[]): Promise<Entity[]> {
    try {
      const data = await this.executeWithRetry<any>(() =>
        this.db.select().from(this.table).where(inArray(this.idColumn, ids)),
      );

      return data as Entity[];
    } catch (error) {
      this.logger.error(`Error finding many ${this.entityName}`, {
        ids,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('findMany', this.entityName, error);
    }
  }

  // ─── FIND ALL (paginated) ────────────────────────────────

  async findAll(limit = 20, offset = 0): Promise<PaginatedResult<Entity>> {
    try {
      // count + fetch in parallel for better performance
      const [countResult, data] = await this.executeWithRetry<any>(() =>
        Promise.all([
          this.db.select({ count: sql<number>`count(*)` }).from(this.table),
          this.db.select().from(this.table).limit(limit).offset(offset),
        ]),
      );

      const total = Number(countResult?.[0]?.count ?? 0);

      return {
        data: data as Entity[],
        meta: {
          total,
          limit,
          offset,
          hasNextPage: offset + limit < total,
          hasPreviousPage: offset > 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error finding all ${this.entityName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('findAll', this.entityName, error);
    }
  }

  // ─── DELETE (returns true if the row existed) ─────────────

  async delete(id: string): Promise<void> {
    try {
      const deleted = await this.executeWithRetry<any>(() =>
        this.db.delete(this.table).where(eq(this.idColumn, id)).returning(),
      );

      if (!deleted || deleted.length === 0) {
        this.logger.warn(`${this.entityName} not found for deletion`, { id });
        throw new DatabaseError('delete', this.entityName,'unable to delete');
      }
      this.logger.info(`Deleted ${this.entityName}`, { id });
    } catch (error) {
      this.logger.error(`Error deleting ${this.entityName}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('delete', this.entityName, error);
    }
  }

  // ─── DELETE MANY (returns count of deleted rows) ──────────

  async deleteMany(ids: string[]): Promise<number> {
    try {
      const deleted = await this.executeWithRetry<any>(() =>
        this.db
          .delete(this.table)
          .where(inArray(this.idColumn, ids))
          .returning(),
      );

      const count = deleted?.length ?? 0;
      this.logger.info(`Deleted ${count} ${this.entityName}(s)`, { ids });
      return count;
    } catch (error) {
      this.logger.error(`Error deleting many ${this.entityName}`, {
        ids,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('deleteMany', this.entityName, error);
    }
  }
}
