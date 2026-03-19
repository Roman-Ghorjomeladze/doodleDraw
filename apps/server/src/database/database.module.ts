import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Language, LanguageSchema } from './schemas/language.schema';
import { Word, WordSchema } from './schemas/word.schema';
import { RoomDoc, RoomDocSchema } from './schemas/room.schema';
import { ProfileDoc, ProfileDocSchema } from './schemas/profile.schema';
import { AuthTokenDoc, AuthTokenDocSchema } from './schemas/auth-token.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Language.name, schema: LanguageSchema },
      { name: Word.name, schema: WordSchema },
      { name: RoomDoc.name, schema: RoomDocSchema },
      { name: ProfileDoc.name, schema: ProfileDocSchema },
      { name: AuthTokenDoc.name, schema: AuthTokenDocSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    const { host, port, name } = this.connection;
    this.logger.log(`MongoDB connected → ${host}:${port}/${name}`);

    const langCount = await this.connection.collection('languages').countDocuments();
    const wordCount = await this.connection.collection('words').countDocuments();
    this.logger.log(`Database has ${langCount} languages and ${wordCount} words`);

    if (wordCount === 0) {
      this.logger.warn('Database is empty! Run "pnpm db:seed" to populate words.');
    }
  }
}
