import { Global, Module } from '@nestjs/common';
import { HmacService } from './hmac.service';
import { OtpService } from './otp.service';
import { JwtService } from './jwt.service';
import { AppVariablesService } from './appVariables.service';

@Global()
@Module({
    providers:[HmacService,OtpService,JwtService,AppVariablesService],
    exports:[HmacService,OtpService,JwtService,AppVariablesService]
})
export class UtilModule {}
