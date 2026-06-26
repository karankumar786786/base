import { Injectable } from "@nestjs/common";
import { DataBase,ProvideDatabase } from "@org/database";

@Injectable()
export class DatabaseProvider{
    private readonly db:DataBase;
    constructor() {
    this.db =  ProvideDatabase(process.env.DATABASE_URL!);
    }
    getDatabase():DataBase{
        return this.db;
    }
}