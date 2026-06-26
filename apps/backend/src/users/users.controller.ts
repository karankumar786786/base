import { Controller, Get,  Body, Patch, Param, Delete, UseGuards, Req,  UsePipes } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/decorators/role.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RoleGuard } from 'src/guards/role.guard';
import { ZodPipe } from 'src/internal/zodValidation';
import {z} from "zod";
import type { Request } from 'express';



@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
    

    @Patch('update-profile-picture')
    @UsePipes(ZodPipe({body:z.object({profilePicture:z.string({invalid_type_error:"type string is required",required_error:"profilePicture is required"})})}))
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(['user'])
    async updateProfilePicture(@Req() req:Request,@Body() body:{profilePicture:string}){
        const id = req.userId;
        const profilePicture = body.profilePicture;
        await this.usersService.updateProfilePicture(id,profilePicture);
        return;
    }

    @Get('profile')
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(['user'])
    async getProfile(@Req() req:Request){
        const id = req.userId;
        const user = await this.usersService.getProfileById(id);
        return user;
    }

    @Get('profile/:email')
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(['user'])
    async getProfileByEmail(@Param('email') email:string){
        const user = await this.usersService.getProfileByEmail(email);
        return user;
    }

    @Patch('update-name')
    @UsePipes(ZodPipe({body:z.object({name:z.string()})}))
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(['user'])
    async updateName(@Req() req:Request,@Body() body:{name:string}){
        const id = req.userId;
        const name = body.name;
        await this.usersService.updateName(id,name);
        return;
    }

    @Delete('delete-profile-picture')
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(['user'])
    async deleteProfilePicture(@Req() req:Request){
        const id = req.userId;
        await this.usersService.deleteProfilePicture(id);
        return;
    }
}
