import { BaseAbstractRepository } from './abstractBaseRepository.js';
import {
  CreateUserSchema,
  userTable,
  UpdateUserSchema,
  type CreateUserDto,
  type UpdateUserDto,
  type User,
} from '../lib/schema.js';
import { DataBase } from '../index.js';
import { Logger } from '../lib/logger.js';
import { eq } from 'drizzle-orm';


/**
 * UserRepository — handles database operations for the User entity.
 * Inherits all standard CRUD operations from BaseAbstractRepository.
 */
export class UserRepo extends BaseAbstractRepository<
  CreateUserDto,
  UpdateUserDto,
  User
> {
    protected readonly table = userTable;
    protected readonly idColumn = userTable.id;
    protected readonly entityName = 'User';
    protected readonly createSchema = CreateUserSchema;
    protected readonly updateSchema = UpdateUserSchema;

    constructor(db: DataBase, logger: Logger) {
        super(db, logger);
    }

    async findByEmail(email: string): Promise<User | null> {
        const [user] = await this.db.select().from(this.table).where(eq(this.table.email, email));
        return user || null;
    }
}