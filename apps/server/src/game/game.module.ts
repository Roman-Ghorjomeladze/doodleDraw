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
import { BotDrawingService } from './bot/bot-drawing.service';
import { BotVisionService } from './bot/bot-vision.service';
import { BotSchedulerService } from './bot/bot-scheduler.service';
import { PermanentLobbiesService } from './bot/permanent-lobbies.service';
import { OnlineTrackerService } from './online-tracker.service';
import { FriendService } from './friend.service';
import { FriendsController } from './friends.controller';

@Module({
  imports: [WordsModule, AuthModule],
  controllers: [FriendsController],
  providers: [
    RoomPersistenceService,
    ProfileService,
    OnlineTrackerService,
    FriendService,
    RoomService,
    ClassicModeService,
    TeamModeService,
    DrawingService,
    BotDrawingService,
    BotVisionService,
    BotSchedulerService,
    PermanentLobbiesService,
    GameService,
    GameGateway,
  ],
  exports: [RoomService, GameService, GameGateway, ProfileService, PermanentLobbiesService],
})
export class GameModule {}
