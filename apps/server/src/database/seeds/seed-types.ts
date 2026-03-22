export interface WordEntry {
  word: string;
  botCompatible?: boolean;
}

export interface WordSeedData {
  language: {
    code: string;
    name: string;
    nativeName: string;
  };
  words: {
    easy: (string | WordEntry)[];
    medium: (string | WordEntry)[];
    hard: (string | WordEntry)[];
  };
}
