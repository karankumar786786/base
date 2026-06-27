import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ZodSchema } from 'zod';

@Injectable()
export class CacheService implements OnApplicationShutdown {
    private readonly cache: Redis;

    constructor() {
        this.cache = new Redis(String(process.env.CACHE_URL));
    }

    async onApplicationShutdown(signal?: string) {
        await this.cache.quit();
    }

    async set<T>(key: string, data: T, schema?: ZodSchema<T>): Promise<void> {
        let validatedData = data;
        if (schema) {
            validatedData = await schema.parseAsync(data);
        }
        const parsedData = JSON.stringify(validatedData);
        await this.cache.set(key, parsedData);
    }

    async setWithTTL<T>(key: string, data: T, expiryInMin: number, schema?: ZodSchema<T>): Promise<void> {
        let validatedData = data;
        if (schema) {
            validatedData = await schema.parseAsync(data);
        }
        const parsedData = JSON.stringify(validatedData);
        await this.cache.set(key, parsedData, 'EX', expiryInMin * 60);
    }

    async get<T>(key: string, schema?: ZodSchema<T>): Promise<T | null> {
        const data = await this.cache.get(key);
        if (!data) return null;
        const parsed = JSON.parse(data);
        if (schema) {
            return await schema.parseAsync(parsed);
        }
        return parsed;
    }

    async del(key: string): Promise<void> {
        await this.cache.del(key);
    }
}
