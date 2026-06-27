import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('nats')
export class NatsController {
    private readonly logger:Logger = new Logger();
    constructor(
    ) {
    }
    @MessagePattern(`message.server1`)
    handleMessage(@Payload() data:any){
        this.logger.log('recived message in another server');
        this.logger.log(data);
    }
}
