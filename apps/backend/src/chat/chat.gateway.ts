import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import {Logger, OnModuleInit} from "@nestjs/common";
import { Server, Socket } from 'socket.io';
import { CacheService } from 'src/cache/cache.service';
import { JwtService } from 'src/util/jwt.service';
import { NextFunction } from 'express';
import { blackListTokenCache, tokenPayloadSchema } from 'src/auth/auth.service';
import { HmacService } from 'src/util/hmac.service';
import { InvalidTokenException } from 'src/filtures/invalidTokenException.filter';
import {z} from "zod";

@WebSocketGateway({
  cors:{
    origin: '*'
  }
})
export class ChatGateway implements OnGatewayInit,OnGatewayConnection,OnGatewayDisconnect{
  constructor(
    private readonly cacheService:CacheService,
    private readonly jwtService:JwtService,
    private readonly hmacService:HmacService,
  ) {}
  handleConnection(client: Socket, ...args: any[]) {
    const socketId = client.id;

  }
  handleDisconnect(client: Socket) {
    throw new Error('Method not implemented.');
  }
  afterInit(server:Server) {
    this.logger.log('WebSocket Gateway has been initialized successfully.');
    server.use(async (socket: Socket, next: NextFunction) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.token ||
          socket.handshake.query.token ||
          socket.handshake.query.auth;

        if (!token || typeof token !== 'string') {
          throw new InvalidTokenException();
        }

        const decoded = await this.jwtService.verify<typeof tokenPayloadSchema>(
          token,
          tokenPayloadSchema,
          'accessToken',
        );
        await this.hmacService.verifyId(decoded.subject);
        const data = await this.cacheService.get<blackListTokenCache>(
          `blacklistToken:${decoded.jti}`,
        );
        if (data) {
          throw new InvalidTokenException();
        }
        const socketCacheSchema = z.string();
        await this.cacheService.set(
          `socket:${decoded.subject}`,
          socket.id,
          socketCacheSchema,
        );
        socket.tokenId = decoded.jti;
        socket.role = decoded.role;
        socket.userId = decoded.subject;
        socket.audience = decoded.audience;
        next();
      } catch (error) {
        next(error instanceof Error ? error : new InvalidTokenException());
      }
    });
  }
  private readonly logger:Logger = new Logger('ChatGateway');
  @WebSocketServer()
  private readonly server:Server;
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: {to:string,message:string}): void {
    this.logger.log(payload);
    client.to(payload.to).emit('server',payload.message);
    return;
  }
}
