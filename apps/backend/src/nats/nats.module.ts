import { Module } from '@nestjs/common';
import { NatsController } from './nats.controller';

@Module({
  controllers: [NatsController]
})
export class NatsModule {}
