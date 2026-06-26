import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, User } from '@org/database';
import { UserRepository } from 'src/repository/user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(data: CreateUserDto): Promise<User> {
    return await this.userRepository.create(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    await this.userRepository.delete(userId);
  }
  async updateProfilePicture(
    id: string,
    profilePicture: string,
  ): Promise<void> {
    await this.userRepository.update(id, { profilePicture });
    return;
  }
  async getProfileById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async getProfileByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async updateName(id: string, name: string): Promise<void> {
    await this.userRepository.update(id, { name });
    return;
  }
  async deleteProfilePicture(id: string): Promise<void> {
    await this.userRepository.update(id, { profilePicture: '' });
    return;
  }
}
