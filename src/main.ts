import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from "./common/filters/http-exception.filter";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  });

  // Global prefix for all routes
  app.setGlobalPrefix("api");

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filters
  app.useGlobalFilters(new HttpExceptionFilter(), new AllExceptionsFilter());

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle("Power Plant Generation API")
    .setDescription(
      "REST API for querying US power plant generation data from eGRID 2021 dataset"
    )
    .setVersion("1.0")
    .addTag("Plants", "Power plant generation endpoints")
    .addTag("States", "State-level generation summary endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
