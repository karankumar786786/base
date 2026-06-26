import { and, count, eq } from "drizzle-orm";
import { DataBase, Logger } from "../index.js";
import {
  Auth,
  authTable,
  CreateAuthDto,
  CreateAuthSchema,
  UpdateAuthDto,
  UpdateAuthSchema,
} from "../lib/schema.js";
import { BaseAbstractRepository } from "./abstractBaseRepository.js";

export class AuthRepo extends BaseAbstractRepository<
  CreateAuthDto,
  UpdateAuthDto,
  Auth
> {
  protected table = authTable;
  protected idColumn = authTable.id;
  protected entityName = "Auth";
  protected createSchema = CreateAuthSchema;
  protected updateSchema = UpdateAuthSchema;
  constructor(db: DataBase, logger: Logger) {
    super(db, logger);
  }
  async findByRefreshTokenJti(refreshTokenJti:string):Promise<Auth | null>{
    const [data] = await this.db.select().from(this.table).where(eq(this.table.refreshTokenJTI,refreshTokenJti));
    return data;
  }
  async findByAccessTokenJti(accessTokenJti:string):Promise<Auth | null>{
    const [data] = await this.db.select().from(this.table).where(eq(this.table.accessTokenJTI,accessTokenJti));
    return data;
  }
  // async findNoOfActiveSession(userId:string):Promise<{numberOfActiveSessions:number}>{
  //     const [data] = await this.db.select({numberOfActiveSessions:count()}).from(this.table).where(and(eq(this.table.userId,userId),eq(this.table.blacklisted,false)));
  //     return data;
  // }
  async deleteByRefreshTokenJti(refreshTokenJti:string):Promise<void>{
    await this.db.delete(this.table).where(eq(this.table.refreshTokenJTI,refreshTokenJti));
    return;
  }
  async deleteByAccessJti(accessTokenJti:string):Promise<void>{
    await this.db.delete(this.table).where(eq(this.table.accessTokenJTI,accessTokenJti));
    return;
  }
}
