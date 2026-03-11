import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from '../game/game.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [ConfigModule, GameModule],
  controllers: [AdminController],
})
export class AdminModule {}
