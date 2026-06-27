import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger, OnModuleInit, OnApplicationShutdown, Inject } from "@nestjs/common";
import { Server, Socket } from 'socket.io';
import { CacheService } from 'src/cache/cache.service';
import { JwtService } from 'src/util/jwt.service';
import { NextFunction } from 'express';
import { blackListTokenCache, tokenPayloadSchema } from 'src/auth/auth.service';
import { HmacService } from 'src/util/hmac.service';
import { InvalidTokenException } from 'src/filtures/invalidTokenException.filter';
import {z} from "zod";
import { AppVariablesService } from 'src/util/appVariables.service';
import { ClientProxy } from '@nestjs/microservices';

@WebSocketGateway({
  cors:{
    origin: '*'
  }
})
export class ChatGateway implements OnGatewayInit,OnGatewayConnection,OnGatewayDisconnect,OnApplicationShutdown{
  constructor(
    private readonly cacheService:CacheService,
    private readonly jwtService:JwtService,
    private readonly hmacService:HmacService,
    private readonly appVariables:AppVariablesService,
    @Inject('NATS') private readonly nats:ClientProxy
  ) {}
  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }
  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.userId) {
      try {
        await this.cacheService.del(`socket:${client.userId}`);
        this.logger.log(`Removed socket cache entry for user: ${client.userId}`);
      } catch (err: any) {
        this.logger.error(`Failed to delete socket cache for user ${client.userId}: ${err.message}`);
      }
    }
  }
  async onApplicationShutdown(signal?: string) {
    this.logger.log('Closing WebSocket Gateway server and disconnecting active clients...');
    if (this.server) {
      const sockets = await this.server.fetchSockets();
      for (const socket of sockets) {
        socket.disconnect(true);
      }
    }
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
          `${socket.id}$$${this.appVariables.serverId}`,
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
    const to = payload.to.split('$');
    if (to[1] != this.appVariables.serverId) {
      this.nats.emit('message.server1',payload);
      this.logger.log('message sent in other server')
    };
    client.to(to[0]).emit('server',payload.message);
    return;
  }
}
