import { Module } from '@nestjs/common';
import { WordsModule } from '../words/words.module';
import { AuthModule } from '../auth/auth.module';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { ClassicModeService } from './classic-mode.service';
import { TeamModeService } from './team-mode.service';
import { DrawingService } from './drawing.service';
import { GameGateway } from './game.gateway';
import { RoomPersistenceService } from './room-persistence.service';
import { ProfileService } from './profile.service';

@Module({
  imports: [WordsModule, AuthModule],
  providers: [
    RoomPersistenceService,
    ProfileService,
    RoomService,
    GameService,
    ClassicModeService,
    TeamModeService,
    DrawingService,
    GameGateway,
  ],
  exports: [RoomService, GameService, GameGateway, ProfileService],
})
export class GameModule {}
