import { Injectable } from "@nestjs/common";

@Injectable()
export class AppVariablesService {
    readonly serverId:string = crypto.randomUUID().replaceAll('-',"");
}
