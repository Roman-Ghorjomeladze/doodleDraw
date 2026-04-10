import { Module, forwardRef } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController, AdminFeedbackController } from './feedback.controller';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AuthModule, forwardRef(() => AdminModule)],
  providers: [FeedbackService],
  controllers: [FeedbackController, AdminFeedbackController],
  exports: [FeedbackService],
})
export class FeedbackModule {}
