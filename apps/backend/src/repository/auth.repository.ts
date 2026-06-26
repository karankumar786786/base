import { AuthRepo, LoggerAdapter } from "@org/database";
import { DatabaseProvider } from "./db.provider";
import { Logger, Injectable } from "@nestjs/common";

@Injectable()
export class AuthRepository extends AuthRepo{
    constructor(databaseProvider: DatabaseProvider) {
        super(databaseProvider.getDatabase(), new LoggerAdapter(new Logger('UserRepository')));
      }
}
