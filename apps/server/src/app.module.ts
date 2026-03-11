import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './database/database.module';
import { WordsModule } from './words/words.module';
import { GameModule } from './game/game.module';
import { AdminModule } from './admin/admin.module';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imports: any[] = [
  ConfigModule.forRoot(),
  DatabaseModule,
  WordsModule,
  GameModule,
  AdminModule,
];

// In production, serve the built React app as static files
if (process.env.NODE_ENV === 'production') {
  imports.push(
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
      exclude: ['/api/(.*)', '/socket.io/(.*)'],
    }),
  );
}

@Module({ imports })
export class AppModule {}
