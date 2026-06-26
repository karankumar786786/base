// ─── RESULT TYPES ────────────────────────────────────────────

/** Per-item result for batch operations (createMany, updateMany). */
export interface RepositoryResult<T> {
  success: boolean;
  statusCode: number;
  data: T | null;
  error?: string;
}

/** Metadata for paginated queries. */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Wrapper for paginated query results. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── REPOSITORY CONTRACT ─────────────────────────────────────

/**
 * BaseRepository — the contract every entity repository must implement.
 *
 * Generic parameters:
 *   CreateDto  – the shape of data used to create a new record
 *   UpdateDto  – the shape of data used to update an existing record
 *   Entity     – the shape of a row returned from queries
 */
export interface BaseRepository<CreateDto, UpdateDto, Entity> {
  // single-record writes
  create(data: CreateDto): Promise<Entity>;
  update(id: string, data: UpdateDto): Promise<Entity>;

  // batch writes — return per-item success/failure
  createMany(data: CreateDto[]): Promise<Entity[]>;
  updateMany(data: { id: string; data: UpdateDto }[]): Promise<Entity[]>;

  // reads
  findById(id: string): Promise<Entity | null>;
  findMany(ids: string[]): Promise<Entity[]>;                     // by specific IDs — no pagination
  findAll(limit?: number, offset?: number): Promise<PaginatedResult<Entity>>; // paginated scan

  // deletes — return true if the row actually existed
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<number>;  // returns count of deleted rows
}