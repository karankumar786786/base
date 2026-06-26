import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class HmacService {
  private readonly logger = new Logger(HmacService.name);
  private readonly secret: string;

  constructor() {
    this.secret = String(process.env.SECRET);
  }

  async generateId(): Promise<string> {
    const userId = crypto.randomUUID().replaceAll("-","");

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(userId)
      .digest('hex');

    return `${userId}:${signature}`;
  }

  async verifyId(id: string): Promise<void> {
    const [userId, receivedSignature] = id.split(':');

    if (!userId || !receivedSignature) {
      throw new Error('Invalid format');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(userId)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }
  }
}