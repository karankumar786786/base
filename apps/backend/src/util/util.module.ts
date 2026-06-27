import { Global, Module } from '@nestjs/common';
import { HmacService } from './hmac.service';
import { OtpService } from './otp.service';
import { JwtService } from './jwt.service';
import { AppvariablesService } from './appVariables.service';

@Global()
@Module({
    providers:[HmacService,OtpService,JwtService,AppvariablesService],
    exports:[HmacService,OtpService,JwtService,AppvariablesService]
})
export class UtilModule {}

