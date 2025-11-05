import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { PlantsModule } from "./modules/plants/plants.module";
import { StatesModule } from "./modules/states/states.module";

/**
 * AppModule
 *
 * Root module that imports all feature modules:
 * - PrismaModule: Global database access
 * - RedisModule: Global caching (optional)
 * - PlantsModule: Plant-related endpoints
 * - StatesModule: State-related endpoints
 */
@Module({
  imports: [PrismaModule, RedisModule, PlantsModule, StatesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
