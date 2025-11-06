import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
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
 * - ThrottlerModule: Rate limiting (100 requests per minute)
 * - PlantsModule: Plant-related endpoints
 * - StatesModule: State-related endpoints
 */
@Module({
  imports: [
    // Rate Limiting Configuration
    // Limits each IP to 100 requests per 60 seconds (1 minute)
    // Can be overridden per-route with @Throttle() decorator
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (60 seconds)
        limit: 100, // Maximum requests within the time window
      },
    ]),
    PrismaModule,
    RedisModule,
    PlantsModule,
    StatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
