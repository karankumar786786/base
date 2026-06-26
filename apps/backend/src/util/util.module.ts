import { Global, Module } from '@nestjs/common';
import { HmacService } from './hmac.service';
import { OtpService } from './otp.service';
import { JwtService } from './jwt.service';

@Global()
@Module({
    providers:[HmacService,OtpService,JwtService],
    exports:[HmacService,OtpService,JwtService]
})
export class UtilModule {}

