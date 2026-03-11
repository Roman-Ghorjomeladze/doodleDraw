import { Module } from '@nestjs/common';
import { WordsModule } from '../words/words.module';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { ClassicModeService } from './classic-mode.service';
import { TeamModeService } from './team-mode.service';
import { DrawingService } from './drawing.service';
import { GameGateway } from './game.gateway';

@Module({
  imports: [WordsModule],
  providers: [
    RoomService,
    GameService,
    ClassicModeService,
    TeamModeService,
    DrawingService,
    GameGateway,
  ],
  exports: [RoomService, GameService, GameGateway],
})
export class GameModule {}
