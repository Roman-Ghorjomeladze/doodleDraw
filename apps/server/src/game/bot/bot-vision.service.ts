import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BotVisionService {
  private readonly logger = new Logger(BotVisionService.name);

  private readonly apiKey = process.env.ANTHROPIC_API_KEY;

  /**
   * Send a canvas snapshot to Claude Haiku vision and get a guess.
   * Returns the guessed word, or null if unsure.
   */
  async guessFromSnapshot(
    canvasBase64: string,
    wordHint: string,
    language: string,
    previousGuesses: string[] = [],
    letterCount?: number,
    revealedHints?: string[],
  ): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set — bot guessing disabled');
      return null;
    }

    try {
      // Strip data URI prefix if present.
      const base64Data = canvasBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 30,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: this.buildPrompt(wordHint, language, previousGuesses, letterCount, revealedHints),
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Claude API error (${response.status}): ${errorText}`);
        return null;
      }

      const data = await response.json();
      const text = data.content?.[0]?.text?.trim().toLowerCase();

      if (!text || text === 'unsure' || text.includes('unsure')) {
        return null;
      }

      // Clean the response — sometimes the model adds punctuation or extra words.
      const cleaned = text
        .replace(/[.!?,;:"'()[\]{}]/g, '')
        .trim()
        .split('\n')[0]
        .trim();

      if (cleaned.length === 0 || cleaned.length > 50) {
        return null;
      }

      return cleaned;
    } catch (err: any) {
      if (err.name === 'TimeoutError') {
        this.logger.debug('Claude API timed out');
      } else {
        this.logger.warn(`Claude vision error: ${err.message}`);
      }
      return null;
    }
  }

  private buildPrompt(
    wordHint: string,
    language: string,
    previousGuesses: string[] = [],
    letterCount?: number,
    revealedHints?: string[],
  ): string {
    const langName = language === 'ka' ? 'Georgian' : language === 'tr' ? 'Turkish' : language === 'ru' ? 'Russian' : 'English';

    let prompt = `This is a Pictionary-style drawing game. Someone is drawing a word and you need to guess it.

The word hint is: "${wordHint}" (underscores represent hidden letters, spaces separate words)
The word is in ${langName}.`;

    if (letterCount) {
      prompt += `\nThe word has exactly ${letterCount} letters.`;
    }

    if (revealedHints && revealedHints.length > 0) {
      const latestHint = revealedHints[revealedHints.length - 1];
      prompt += `\nRevealed letters so far: "${latestHint}" (letters shown in their correct positions, underscores are still hidden)`;
    }

    if (previousGuesses.length > 0) {
      prompt += `\n\nIMPORTANT: The following guesses were already tried and are WRONG. Do NOT guess any of these: ${previousGuesses.join(', ')}. You must guess a different word.`;
    }

    prompt += `\n\nWhat is being drawn? Reply with ONLY the word (in ${langName}), nothing else. If the drawing is too incomplete or unclear to identify, reply with just "unsure".`;

    return prompt;
  }
}
