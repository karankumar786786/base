import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repository/repository.module';
import { UtilModule } from '../util/util.module';
import { AuthModule } from 'src/auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from 'src/users/users.module';
import { ChatGateway } from 'src/chat/chat.gateway';

@Module({
  imports: [RepositoryModule, UtilModule, AuthModule, CacheModule,UsersModule,ChatGateway],
})
export class AppModule {}
