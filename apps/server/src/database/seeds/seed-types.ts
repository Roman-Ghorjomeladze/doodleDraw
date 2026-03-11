export interface WordSeedData {
  language: {
    code: string;
    name: string;
    nativeName: string;
  };
  words: {
    easy: string[];
    medium: string[];
    hard: string[];
  };
}
