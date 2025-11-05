import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * PrismaModule
 *
 * Global module that provides PrismaService to all modules
 * @Global decorator makes it available without explicit imports
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
