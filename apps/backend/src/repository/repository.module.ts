import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { DatabaseProvider } from './db.provider';
import { AuthRepository } from './auth.repository';

@Global()
@Module({
  providers: [DatabaseProvider, UserRepository, AuthRepository],
  exports: [UserRepository, AuthRepository],
})
export class RepositoryModule {}
