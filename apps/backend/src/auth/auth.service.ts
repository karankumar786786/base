import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, CreateUserSchema, User } from '@org/database';
import { CacheService } from '../cache/cache.service';
import { OtpService } from '../util/otp.service';
import { JwtService } from '../util/jwt.service';
import { z } from 'zod';
import { HmacService } from 'src/util/hmac.service';
import { UsersService } from 'src/users/users.service';
import { AuthRepository } from 'src/repository/auth.repository';
import { InvalidTokenException } from 'src/filtures/invalidTokenException.filter';

// ─── Schemas & Types ────────────────────────────────────────────

const tempDataSchema = CreateUserSchema.extend({
    id: z.string().optional(),
    otp: z.string(),
    for: z.enum(['register', 'login']),
});

export const tokenPayloadSchema = z.null();
const tempTokenPayloadSchema = z.object({for:z.enum(['register', 'login'])});

type TempDataCache = z.infer<typeof tempDataSchema>;

type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

type VerifyOtpResult = {
    authTokens: AuthTokens;
    user: User;
};

export type blackListTokenCache = {}

@Injectable()
export class AuthService {
    
    constructor(
        private readonly usersService:UsersService,
        private readonly cacheService: CacheService,
        private readonly otpService: OtpService,
        private readonly jwtService: JwtService,
        private readonly hmacService: HmacService,
        private readonly authRepository: AuthRepository,
    ) {}


    async register(data: CreateUserDto): Promise<string> {
        const existingUser = await this.usersService.findByEmail(data.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const id = await this.hmacService.generateId();
        data.id = id;
        const otp = this.otpService.generateOtp();
        await this.otpService.sendOtp(data.email, 'Verification OTP', otp);
        const {jti,token:tempToken} = await this.jwtService.generateToken<typeof tempTokenPayloadSchema>(
            {
                subject: id,
                audience: 'web',
                role: 'user',
                data: {for: 'register' },
            },
            5,
            'tempToken',
        );
        await this.cacheService.setWithTTL<TempDataCache>(
            `temp-token:${tempToken}`,
            { ...data, otp, for: 'register' },
            5,
        );
        return tempToken;
    }


    async login(email: string): Promise<string> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        const otp = this.otpService.generateOtp();
        await this.otpService.sendOtp(email, 'Login OTP', otp);
        const cacheData: TempDataCache = {
            id: user.id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture ?? '',
            otp,
            for: 'login',
        };
        const {jti,token:tempToken} = await this.jwtService.generateToken<typeof tempTokenPayloadSchema>(
            {
                subject: user.id,
                audience: 'web',
                role: 'user',
                data: {for:'login'},
            },
            5,
            'tempToken',
        );
        await this.cacheService.setWithTTL<TempDataCache>(
            `temp-token:${tempToken}`,
            cacheData,
            5,
        );

        return tempToken;
    }

    async verifyOtp(tempToken: string, otp: string): Promise<VerifyOtpResult> {
            await this.jwtService.verify<typeof tempTokenPayloadSchema>(
            tempToken,
            tempTokenPayloadSchema,
            'tempToken',
        );

        const cached = await this.cacheService.get<TempDataCache>(`temp-token:${tempToken}`);
        if (!cached) {
            throw new BadRequestException('Invalid or expired session token');
        }

        if (cached.otp !== otp) {
            throw new BadRequestException('Invalid OTP');
        }

        let user: User | null = null;

        if (cached.for === 'register') {
            const userData: CreateUserDto = {
                id: cached.id ?? await this.hmacService.generateId(),
                email: cached.email,
                name: cached.name,
                profilePicture: cached.profilePicture || '',
            };
            user = await this.usersService.create(userData);
        } else {
            user = await this.usersService.findByEmail(cached.email);
            if (!user) {
                throw new NotFoundException('User not found');
            }
        }

        const [access, refresh] = await Promise.all([
            this.jwtService.generateToken<typeof tokenPayloadSchema>(
                {
                    subject: user.id,
                    audience: 'web',
                    role: 'user',
                    data: null,
                },
                30,
                'accessToken',
            ),
            this.jwtService.generateToken<typeof tokenPayloadSchema>(
                {
                    subject: user.id,
                    audience: 'web',
                    role: 'user',
                    data: null,
                },
                120,
                'refreshToken',
            ),
        ]);

        await this.cacheService.del(`temp-token:${tempToken}`);
        await this.authRepository.create({id:await this.hmacService.generateId(),userId:user.id,accessTokenJTI:access.jti,refreshTokenJTI:refresh.jti});
        return {
            authTokens: { accessToken:access.token, refreshToken:refresh.token },
            user,
        };
    }

    async resendOtp(tempToken: string): Promise<void> {
        const decoded = await this.jwtService.verify<typeof tempTokenPayloadSchema>(tempToken,tempTokenPayloadSchema, 'tempToken');
        const cached = await this.cacheService.get<TempDataCache>(`temp-token:${tempToken}`,tempDataSchema);
        if (!cached) {
            throw new BadRequestException('Invalid or expired session token');
        }
        const email = cached.email;
        const newOtp = this.otpService.generateOtp();
        const subject = cached.for === 'register' ? 'Verification OTP' : 'Login OTP';
        await this.otpService.sendOtp(email, subject, newOtp);
        await this.cacheService.setWithTTL<TempDataCache>(
            `temp-token:${tempToken}`,
            { ...cached, otp: newOtp },
            5,

        );
    }



    async refreshAccessToken(token:string):Promise<{authTokens:{accessToken:string,refreshToken:string}}>{
        const data = await this.jwtService.verify<typeof tokenPayloadSchema>(token,tokenPayloadSchema,'refreshToken');
        const tokenId = data.jti;
        const auth = await this.authRepository.findByRefreshTokenJti(tokenId);
        if (!auth) {
            throw new InvalidTokenException;
        }
        const id = data.subject;
        await this.hmacService.verifyId(id);
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new NotFoundException('user not found');
        };
        await this.authRepository.deleteByRefreshTokenJti(tokenId);
        const [access, refresh] = await Promise.all([
            this.jwtService.generateToken<typeof tokenPayloadSchema>(
                {
                    subject: user.id,
                    audience: 'web',
                    role: 'user',
                    data: null,
                },
                30,
                'accessToken',
            ),
            this.jwtService.generateToken<typeof tokenPayloadSchema>(
                {
                    subject: user.id,
                    audience: 'web',
                    role: 'user',
                    data: null,
                },
                120,
                'refreshToken',
            ),
        ]);
        await this.authRepository.create({id:await this.hmacService.generateId(),userId:id,accessTokenJTI:access.jti,refreshTokenJTI:refresh.jti});
        return {
            authTokens:{
                accessToken:access.token,
                refreshToken:refresh.token
            }
        }
    }

    async logout(accessTokenJti:string):Promise<void>{
        await this.cacheService.setWithTTL<blackListTokenCache>(`blacklistToken:${accessTokenJti}`,{},30);
        await this.authRepository.deleteByAccessJti(accessTokenJti);
        return;
    }
    async deleteAccount(userId: string,accessTokenJti:string):Promise<void> {
        await this.logout(accessTokenJti);
        await this.usersService.deleteAccount(userId);
        return;
    }
}
