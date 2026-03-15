import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Language, LanguageSchema } from './schemas/language.schema';
import { Word, WordSchema } from './schemas/word.schema';

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
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
