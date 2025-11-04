"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const user_entity_1 = require("./entities/user.entity");
let UsersService = class UsersService {
    users = [
        new user_entity_1.User({
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            createdAt: new Date(),
            updatedAt: new Date(),
        }),
    ];
    findAll() {
        return this.users;
    }
    findOne(id) {
        return this.users.find((user) => user.id === id);
    }
    create(createUserDto) {
        const newUser = new user_entity_1.User({
            id: this.users.length + 1,
            ...createUserDto,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        this.users.push(newUser);
        return newUser;
    }
    update(id, updateUserDto) {
        const userIndex = this.users.findIndex((user) => user.id === id);
        if (userIndex === -1) {
            return undefined;
        }
        this.users[userIndex] = {
            ...this.users[userIndex],
            ...updateUserDto,
            updatedAt: new Date(),
        };
        return this.users[userIndex];
    }
    remove(id) {
        const userIndex = this.users.findIndex((user) => user.id === id);
        if (userIndex === -1) {
            return false;
        }
        this.users.splice(userIndex, 1);
        return true;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)()
], UsersService);
//# sourceMappingURL=users.service.js.map