import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppVariablesService } from 'src/util/appVariables.service';

@Controller('nats')
export class NatsController {
    private readonly logger:Logger = new Logger();
    constructor(
        private readonly appVariablesService:AppVariablesService,
    ) {
    }
    @MessagePattern(`message.server1`)
    handleMessage(@Payload() data:any){
        this.logger.log('recived message in another server');
        this.logger.log(data);
    }
}
