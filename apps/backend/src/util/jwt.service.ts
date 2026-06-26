import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { z, type ZodTypeAny } from 'zod';

export const createPayloadSchema = <T extends ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    subject: z.string(),
    audience: z.enum(['web', 'mobile']),
    keyId: z.string().optional(),
    role: z.enum(['user', 'admin', 'superadmin']),
    data: dataSchema
  });

export type TokenPurpose =
  | 'accessToken'
  | 'refreshToken'
  | 'tempToken';

export type Role =
  | 'user'
  | 'admin'
  | 'superadmin';

@Injectable()
export class JwtService {
  private readonly jwtSecret: Uint8Array;
  private readonly issuer: string;

  constructor() {
    this.issuer = String(process.env.ORG_NAME);
    this.jwtSecret = new TextEncoder().encode(
      process.env.JWT_SECRET,
    );
  }

  async generateToken<T extends ZodTypeAny>(
    payload: z.infer<ReturnType<typeof createPayloadSchema<T>>>,
    expiryInMin: number,
    purpose: TokenPurpose,
    notBefore = 0,
  ): Promise<{jti:string,token:string}> {
    const jti = crypto.randomUUID().replaceAll('-','');
    return {
      jti,
      token: await new SignJWT({
      role: payload.role,
      purpose,
      data: payload.data,
    })
      .setProtectedHeader({
        alg: 'HS256',
        typ: 'JWT',
        ...(payload.keyId && {
          kid: payload.keyId,
        }),
      })
      .setSubject(payload.subject)
      .setIssuer(this.issuer)
      .setAudience(payload.audience)
      .setJti(jti)
      .setIssuedAt()
      .setNotBefore(`${notBefore}m`)
      .setExpirationTime(`${expiryInMin}m`)
      .sign(this.jwtSecret)
    };
  }

  async verify<T extends ZodTypeAny>(
    token: string,
    schema: T,
    purpose: TokenPurpose,
  ): Promise<{
    subject: string;
    audience: 'web' | 'mobile';
    role: Role;
    data: z.infer<T>;
    jti: string;
  }> {
    try {
      const { payload } = await jwtVerify(
        token,
        this.jwtSecret,
        {
          issuer: this.issuer,
        },
      );

      if (payload.purpose !== purpose) {
        throw new UnauthorizedException(
          'Invalid token purpose',
        );
      }

      const validatedData = await schema.parseAsync(
        payload.data,
      );

      return {
        subject: payload.sub!,
        audience: payload.aud as
          | 'web'
          | 'mobile',
        role: payload.role as Role,
        data: validatedData,
        jti: payload.jti!,
      };
    } catch {
      throw new UnauthorizedException(
        'Invalid token',
      );
    }
  }
}