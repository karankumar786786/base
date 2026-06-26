import { Injectable, Logger } from "@nestjs/common";
import {z} from "zod";

@Injectable()
export class OtpService{
    private readonly logger:Logger = new Logger(OtpService.name)
    generateOtp():string{
        return String(Math.floor(100000 + Math.random() * 900000))
    }
    async sendOtp(to:string,subject:string,otp:string):Promise<void>{
        this.logger.log(`otp: ${otp}`);
    }
}