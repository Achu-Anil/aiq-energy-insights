import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { User } from "./entities/user.entity";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): User {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(): User[] {
    return this.usersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string): User {
    const user = this.usersService.findOne(+id);
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto): User {
    const user = this.usersService.update(+id, updateUserDto);
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Delete(":id")
  remove(@Param("id") id: string): { message: string } {
    const deleted = this.usersService.remove(+id);
    if (!deleted) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }
    return { message: "User deleted successfully" };
  }
}
