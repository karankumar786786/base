import { Injectable, Logger } from '@nestjs/common';
import { UserRepo, LoggerAdapter } from '@org/database';
import { DatabaseProvider } from './db.provider';

@Injectable()
export class UserRepository extends UserRepo {
  constructor(databaseProvider: DatabaseProvider) {
    super(databaseProvider.getDatabase(), new LoggerAdapter(new Logger('UserRepository')));
  }
}