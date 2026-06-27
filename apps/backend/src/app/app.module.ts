import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repository/repository.module';
import { UtilModule } from '../util/util.module';
import { AuthModule } from 'src/auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from 'src/users/users.module';
import { ChatGateway } from 'src/chat/chat.gateway';
import { NatsModule } from 'src/nats/nats.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [RepositoryModule, UtilModule, AuthModule, CacheModule, UsersModule,NatsModule,ClientsModule.register(
    [
      {
        name:"NATS",
        transport: Transport.NATS,
        options:{
          servers: ['nats://localhost:4222']
        }
      }
    ]
  )],
  providers: [ChatGateway],
})
export class AppModule {}
