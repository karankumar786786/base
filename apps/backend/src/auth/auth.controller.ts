import { Body, Controller, Headers, Patch, Post, UsePipes, BadRequestException, Put, UseGuards, Req, Delete, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserSchema, type CreateUserDto, type User } from '@org/database';
import { ZodPipe } from '../internal/zodValidation';
import { z } from 'zod';
import { AuthGuard } from 'src/guards/auth.guard';
import { RoleGuard } from 'src/guards/role.guard';
import { Roles } from 'src/decorators/role.decorator';
import type {Request} from "express";

const VerifyOtpBodySchema = z.object({
    otp: z.string().min(1, 'OTP is required'),
});

const TempTokenHeaderSchema = z.object({
    'x-temp-token': z.string().min(1, 'x-temp-token header is required'),
});


type RegisterResponse = {
    message: string;
    tempToken: string;
};

type LoginResponse = {
    message: string;
    tempToken: string;
};

type VerifyOtpResponse = {
    authTokens: {
        accessToken: string;
        refreshToken: string;
    };
    user: User;
};

type ResendOtpResponse = {
    message: string;
};

// ─── Controller ─────────────────────────────────────────────────

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

    @Post('register')
    @UsePipes(ZodPipe({ body: CreateUserSchema.omit({ id: true }) }))
    async register(@Body() data: CreateUserDto): Promise<RegisterResponse> {
        const tempToken = await this.authService.register(data);
        return { message: 'OTP sent successfully', tempToken };
    }

    @Post('verify-otp')
    @UsePipes(ZodPipe({ body: VerifyOtpBodySchema }))
    async verifyOtp(
        @Headers() headers: Record<string, string>,
        @Body() data: z.infer<typeof VerifyOtpBodySchema>,
    ): Promise<VerifyOtpResponse> {
        const parsed = TempTokenHeaderSchema.safeParse(headers);
        if (!parsed.success) {
            throw new BadRequestException('x-temp-token header is required');
        }
        return this.authService.verifyOtp(parsed.data['x-temp-token'], data.otp);
    }

    @Post('login')
    @UsePipes(ZodPipe({ body: CreateUserSchema.pick({ email: true }) }))
    async login(@Body() data: { email: string }): Promise<LoginResponse> {
        const tempToken = await this.authService.login(data.email);
        return { message: 'OTP sent successfully', tempToken };
    }

    @Patch('resend-otp')
    async resendOtp(@Headers() headers: Record<string, string>): Promise<ResendOtpResponse> {
        const parsed = TempTokenHeaderSchema.safeParse(headers);
        if (!parsed.success) {
            throw new BadRequestException('x-temp-token header is required');
        }
        await this.authService.resendOtp(parsed.data['x-temp-token']);
        return { message: 'OTP resent successfully' };
    }

    @Post('refresh-token')
    async refreshToken(@Headers('X-REFRESH-TOKEN') refreshToken:string){
        return this.authService.refreshAccessToken(refreshToken);
    }

    @Put('logout')
    @UseGuards(AuthGuard,RoleGuard)
    @Roles(['user'])
    async logout(@Req() req:Request){
        const jti = req.tokenId;
        await this.authService.logout(jti);
        return;
    }
    @Delete('delete-account')
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(['user'])
    async deleteAccount(@Req() req: Request): Promise<void> {
        const id = req.userId;
        const accessTokenJti = req.tokenId;
        await this.authService.deleteAccount(id,accessTokenJti);
        return;
    }
}
