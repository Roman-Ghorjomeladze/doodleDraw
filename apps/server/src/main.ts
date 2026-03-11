import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3001;
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(port);
  console.log(`DoodleDraw server running on http://localhost:${port}`);
}
bootstrap();
