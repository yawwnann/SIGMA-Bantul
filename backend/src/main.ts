import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/interceptors/global-exception.filter';

const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable gzip compression for all responses
  app.use(compression());

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://sigma-bantul.duckdns.org',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  // Bind to 0.0.0.0 to ensure it's accessible from Nginx proxy
  await app.listen(port, '0.0.0.0');

  console.log(
    `🏠 GIS Bencana Backend running on: http://localhost:${port}/api`,
  );
  console.log(`🔌 WebSocket available at: ws://localhost:${port}`);
}
bootstrap();
