import { Module, forwardRef } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { AuthModule } from '../auth/auth.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [GameModule, AuthModule, forwardRef(() => FeedbackModule)],
  controllers: [AdminController],
  providers: [AdminGuard],
  exports: [AdminGuard],
})
export class AdminModule {}
