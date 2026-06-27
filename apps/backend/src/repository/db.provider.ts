import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { DataBase,ProvideDatabase } from "@org/database";

@Injectable()
export class DatabaseProvider implements OnApplicationShutdown {
    private readonly db:DataBase;
    constructor() {
    this.db =  ProvideDatabase(process.env.DATABASE_URL!);
    }
    getDatabase():DataBase{
        return this.db;
    }
    async onApplicationShutdown(signal?: string) {
        const client = (this.db as any).$client;
        if (client && typeof client.end === 'function') {
            await client.end();
        }
    }
}