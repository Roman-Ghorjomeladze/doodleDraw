export const ROOM_CODE_LENGTH = 6;
export const MIN_PLAYERS_CLASSIC = 2;
export const MIN_PLAYERS_TEAM = 4;
export const MAX_PLAYERS = 16;
export const DEFAULT_ROUND_TIME = 80;
export const WORD_OPTIONS_COUNT = 3;
export const HINT_REVEAL_INTERVAL = 20;
export const RECONNECT_TIMEOUT = 30000;

export const DRAWING_COLORS = [
  '#000000', '#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#F39C12', '#3498DB',
  '#E74C3C', '#2ECC71', '#9B59B6', '#1ABC9C', '#E67E22',
  '#FF69B4', '#00CED1', '#FF4500', '#7B68EE', '#32CD32',
] as const;

export const BRUSH_SIZES = [2, 5, 10, 20, 40] as const;

export const AVATAR_SEEDS = [
  'adventurer:Adrian', 'adventurer:Jade', 'adventurer:Destiny', 'adventurer:Kingston',
  'adventurer:Chase', 'adventurer:Riley', 'adventurer:Maria', 'adventurer:Robert',
  'adventurer:Sophia', 'adventurer:Vivian', 'adventurer:Sadie', 'adventurer:George',
  'adventurer:Amaya', 'adventurer:Easton', 'adventurer:Liliana', 'adventurer:Nolan',
] as const;

export const EXTRA_AVATAR_SEEDS = [
  'adventurer:Eden', 'adventurer:Caleb', 'adventurer:Valentina', 'adventurer:Oliver',
  'adventurer:Leo', 'adventurer:Harper', 'adventurer:Miles', 'adventurer:Zara',
  'adventurer:Quinn', 'adventurer:Felix', 'adventurer:Ivy', 'adventurer:Theo',
  'adventurer:Luna', 'adventurer:Milo', 'adventurer:Aria', 'adventurer:Oscar',
  'adventurer:Chloe', 'adventurer:Jasper', 'adventurer:Stella', 'adventurer:Wyatt',
  'adventurer:Ruby', 'adventurer:Axel', 'adventurer:Nova', 'adventurer:Finn',
] as const;

export const TEAM_NAME_PAIRS: [string, string][] = [
  ['Doodle Dragons', 'Sketch Sharks'],
  ['Pixel Pirates', 'Canvas Ninjas'],
  ['Artsy Alpacas', 'Crafty Corgis'],
  ['Scribble Wizards', 'Paint Goblins'],
  ['Brush Bandits', 'Eraser Rebels'],
  ['Crayon Crew', 'Marker Mob'],
  ['Inky Penguins', 'Chalky Monkeys'],
  ['Color Chaos', 'Shade Squad'],
  ['Turbo Turtles', 'Rocket Snails'],
  ['Noodle Doodlers', 'Spaghetti Sketchers'],
  ['Doofy Dolphins', 'Goofy Giraffes'],
  ['Wacky Wolves', 'Funky Foxes'],
];

export const DEFAULT_ROOM_SETTINGS = {
  maxPlayers: 16,
  roundTime: 80,
  language: 'en',
  difficulty: 1 as const,
  totalRounds: 3,
  hintsEnabled: true,
  redrawEnabled: false,
  isPublic: false,
  teamAName: 'Team A',
  teamBName: 'Team B',
};

export const HANDICAP_COLORS = [
  '#000000', '#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#F39C12', '#3498DB',
  '#E74C3C', '#2ECC71', '#9B59B6', '#1ABC9C', '#E67E22',
  '#FF69B4', '#00CED1', '#FF4500', '#7B68EE', '#32CD32',
] as const;
export const HANDICAP_MIN_BRUSH_SIZE = 20;

export const REACTION_EMOJIS = [
  '🎉', '💀', '🏆', '🎯', '🤡', '💩',
  '😭', '🤣', '👀', '😵‍💫', '🥱', '💤',
  '😬', '🤷', '👎', '😍', '😂', '🔥',
] as const;
