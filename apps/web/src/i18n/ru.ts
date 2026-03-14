import type { Translations } from './types';

export const ru: Translations = {
  // App
  'app.title': 'DoodleDraw',
  'app.subtitle': 'Рисуй, угадывай и соревнуйся с друзьями!',

  // Home
  'home.createRoom': 'Создать комнату',
  'home.joinRoom': 'Войти в комнату',

  // Create Room
  'create.gameMode': 'Режим игры',
  'create.classic': 'Классический',
  'create.classicDesc': 'Каждый сам за себя',
  'create.teamBattle': 'Командный бой',
  'create.teamBattleDesc': '2 команды соревнуются',
  'create.nickname': 'Никнейм',
  'create.nicknamePlaceholder': 'Введите никнейм...',
  'create.avatar': 'Выберите аватар',
  'create.showMore': 'Показать ещё',
  'create.showLess': 'Скрыть',

  // Join Room
  'join.roomCode': 'Код комнаты',

  // Lobby
  'lobby.roomCode': 'Код комнаты',
  'lobby.clickToCopy': 'Нажмите для копирования',
  'lobby.classicMode': 'Классический режим',
  'lobby.teamBattle': 'Командный бой',
  'lobby.players': 'Игроки',
  'lobby.settings': 'Настройки',
  'lobby.language': 'Язык',
  'lobby.difficulty': 'Сложность',
  'lobby.easy': 'Легко',
  'lobby.medium': 'Средне',
  'lobby.hard': 'Сложно',
  'lobby.roundTime': 'Время раунда',
  'lobby.seconds': '{{count}} секунд',
  'lobby.rounds': 'Раунды',
  'lobby.nRounds': '{{count}} раунд(ов)',
  'lobby.leave': 'Выйти',
  'lobby.startGame': 'Начать игру',
  'lobby.needMorePlayers': 'Нужно ещё {{count}} игрок(ов)',
  'lobby.teamAName': 'Название команды A',
  'lobby.teamBName': 'Название команды B',
  'lobby.redrawRound': 'Раунд перерисовки',
  'lobby.redrawRoundDesc': 'После всех раундов перерисуйте предыдущие слова',
  'lobby.leaveConfirmTitle': 'Выйти из комнаты?',
  'lobby.leaveConfirmMessage': 'Вы уверены, что хотите покинуть эту комнату?',
  'lobby.confirmLeave': 'Выйти',
  'lobby.cancel': 'Отмена',
  'lobby.starting': 'Начинаем через...',
  'lobby.cancelStart': 'Отмена',

  // Player List
  'player.host': 'Хост',
  'player.drawing': 'Рисует',
  'player.teamA': 'Команда A',
  'player.teamB': 'Команда B',

  // Game
  'game.round': 'Раунд {{number}}',
  'game.chooseWord': 'Выберите слово для рисования!',
  'game.choosingWord': '{{name}} выбирает слово...',
  'game.wordWas': 'Слово было:',
  'game.yourWord': 'Ваше слово:',
  'game.vs': 'VS',
  'game.redrawRound': 'Раунд перерисовки!',

  // Chat
  'chat.title': 'Чат',
  'chat.guessPlaceholder': 'Введите вашу догадку...',
  'chat.youreDrawing': 'Вы рисуете!',
  'chat.guessedWord': '{{name}} угадал(а) слово! (+{{points}})',
  'chat.isClose': '{{name}} близко!',
  'chat.lobbyPlaceholder': 'Напишите сообщение...',
  'chat.spectatorPlaceholder': 'Зрители не могут угадывать...',

  // Spectator
  'spectator.badge': 'Наблюдатель',
  'spectator.spectate': 'Наблюдать',

  // Score Board
  'score.gameOver': 'Игра окончена!',
  'score.winner': 'Победитель!',
  'score.backToHome': 'На главную',

  // Tools
  'tool.pen': 'Кисть',
  'tool.eraser': 'Ластик',
  'tool.fill': 'Заливка',
  'tool.size': 'Размер {{size}}',
  'tool.undo': 'Отменить',
  'tool.clear': 'Очистить',

  // Settings
  'settings.title': 'Настройки',
  'settings.language': 'Язык',
  'settings.fontSize': 'Размер шрифта',
  'settings.fontStyle': 'Стиль шрифта',
  'settings.soundEffects': 'Звуковые эффекты',
  'settings.soundOn': 'Звук включён',
  'settings.soundOff': 'Звук выключен',
  'settings.standard': 'Стандартный',
  'settings.medium': 'Средний',
  'settings.large': 'Большой',

  // Languages
  'lang.en': 'English',
  'lang.ka': 'ქართული (Georgian)',
  'lang.tr': 'Türkçe (Turkish)',
  'lang.ru': 'Русский (Russian)',

  // Rules
  'rules.howToPlay': 'Как играть',
  'rules.title': 'Как играть',
  'rules.close': 'Понятно!',
  'rules.overview': 'Один игрок рисует слово, остальные пытаются угадать. Чем быстрее угадаете, тем больше очков получите!',
  'rules.classic.title': 'Классический режим',
  'rules.classic.desc': 'Игроки по очереди рисуют. Остальные угадывают. Очки зависят от скорости — угадывайте быстрее!',
  'rules.team.title': 'Командный бой',
  'rules.team.desc': 'Две команды соревнуются! Обе команды рисуют одно слово одновременно, но вы видите только холст своей команды. Холст противника размыт.',
  'rules.drawing.title': 'Советы по рисованию',
  'rules.drawing.desc': 'Используйте кисть, ластик и заливку. Меняйте размер кисти и цвета. Можно отменить действие и очистить холст. Буквы и цифры запрещены!',
  'rules.scoring.title': 'Очки',
  'rules.scoring.desc': 'Угадывающие получают больше очков за быстрые ответы. Рисующий тоже получает очки, когда другие угадывают. В командном режиме очки команды суммируются.',
  'rules.difficulty.title': 'Уровни сложности',
  'rules.difficulty.desc': 'Легко — распространённые, простые слова. Средне — менее очевидные слова. Сложно — редкие или сложные слова для опытных игроков.',
  'rules.languages.title': 'Языки',
  'rules.languages.desc': 'Слова доступны на английском, грузинском, турецком и русском языках. Хост выбирает язык слов в настройках лобби.',
  'rules.spectator.title': 'Режим наблюдателя',
  'rules.spectator.desc': 'Присоединяйтесь к любой игре как наблюдатель! Смотрите за обеими командами, следите за чатом, но не можете угадывать и получать очки.',
  'rules.settings.title': 'Настройки комнаты',
  'rules.settings.desc': 'Хост может настроить время раунда, количество раундов, сложность, язык слов и включить бонусный раунд перерисовки.',

  // Connection
  'connection.lost': 'Соединение потеряно',
  'connection.reconnecting': 'Переподключение... (попытка {{attempt}})',
  'connection.failed': 'Не удалось переподключиться',
  'connection.reconnect': 'Переподключиться',
  'connection.disconnected': 'Не в сети',
  'connection.playerDisconnected': '{{name}} потерял(а) соединение',
  'connection.playerReconnected': '{{name}} переподключился(ась)',

  // Player left
  'game.playerLeft': '{{name}} покинул(а) игру',
  'game.returnedToLobby': 'Игра отменена. Возврат в лобби.',
  'game.playerLeftOk': 'OK',

  // Theme
  'theme.switchToLight': 'Переключить на светлый режим',
  'theme.switchToDark': 'Переключить на тёмный режим',
};
