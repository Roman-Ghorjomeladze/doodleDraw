import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks (calls onModuleDestroy / onApplicationShutdown)
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(port);
  logger.log(`DoodleDraw server running on http://localhost:${port}`);

  // Graceful shutdown on SIGTERM / SIGINT (e.g. pm2 stop, Ctrl+C, docker stop)
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    logger.log('Server closed');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
bootstrap();
