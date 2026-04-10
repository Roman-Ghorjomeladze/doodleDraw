import type { Translations } from './types';

export const ru: Translations = {
  // App
  'app.title': 'DoodleDraw',
  'app.subtitle': 'Рисуй, угадывай и соревнуйся с друзьями!',

  // Home
  'home.createRoom': 'Создать комнату',
  'home.joinRoom': 'Войти в комнату',
  'home.availableRooms': 'Доступные комнаты',
  'home.ongoingGames': 'Текущие игры',
  'home.createShort': 'Создать',
  'home.joinShort': 'Войти',
  'home.availableShort': 'Комнаты',
  'home.ongoingShort': 'Текущие',
  'home.publicLobbies': 'Играть с ботом',
  'home.lobbiesShort': 'Боты',
  'home.layoutTabs': 'Вкладки сверху',
  'home.activeGame': 'У вас есть активная игра!',
  'home.rejoinGame': 'Вернуться',
  'home.layoutSidebar': 'Боковая панель',

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
  'lobby.addBot': 'Добавить бота',
  'lobby.teamAName': 'Название команды A',
  'lobby.teamBName': 'Название команды B',
  'lobby.hints': 'Подсказки',
  'lobby.hintsDesc': 'Постепенно раскрывать буквы слова',
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
  'player.joinTeam': 'Вступить',

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
  'score.noPlayers': 'Нет игроков',
  'score.rematch': 'Реванш',
  'score.waitingForPlayers': 'Ждём остальных...',
  'score.rematchStarting': 'Реванш начинается!',

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
  'settings.theme': 'Тема',
  'settings.homeLayout': 'Макет главной',
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

  // Public Rooms
  'publicRooms.title': 'Публичные комнаты',
  'publicRooms.empty': 'Нет доступных комнат. Создайте свою!',
  'publicRooms.join': 'Войти',
  'publicRooms.players': '{{count}}/{{max}}',
  'publicRooms.publicRoom': 'Публичная комната',
  'publicRooms.publicRoomDesc': 'Видна в списке публичных комнат',

  // Ongoing Games
  'ongoingGames.empty': 'Сейчас нет активных игр.',
  'ongoingGames.spectate': 'Наблюдать',
  'ongoingGames.round': 'Раунд {{current}}/{{total}}',
  'ongoingGames.players': '{{count}} игроков',
  'ongoingGames.spectators': '{{count}} зрителей',
  'ongoingGames.phase.selecting_word': 'Выбор слова',
  'ongoingGames.phase.drawing': 'Рисование',
  'ongoingGames.phase.round_end': 'Конец раунда',

  // Pagination
  'pagination.prev': 'Назад',
  'pagination.next': 'Далее',
  'pagination.page': 'Стр. {{current}} из {{total}}',

  // Chat (spectator)
  'chat.spectatorOnly': 'Чат зрителей',
  'chat.expand': 'Развернуть чат',

  // Theme
  'theme.switchToLight': 'Переключить на светлый режим',
  'theme.switchToDark': 'Переключить на тёмный режим',

  // Profile
  'profile.noData': 'Данных профиля пока нет',
  'profile.gamesPlayed': 'Игры',
  'profile.wins': 'Победы',
  'profile.winRate': '% побед',
  'profile.totalScore': 'Общий счёт',
  'profile.correctGuesses': 'Угадано',
  'profile.drawings': 'Рисунки',
  'profile.favoriteWord': 'Любимое слово',

  // Leaderboard
  'leaderboard.title': 'Рейтинг',
  'leaderboard.allTime': 'За всё время',
  'leaderboard.thisWeek': 'На этой неделе',
  'leaderboard.noPlayers': 'Игроков пока нет',
  'leaderboard.games': 'игр',
  'leaderboard.wins': 'побед',
  'leaderboard.score': 'очки',

  'leaderboard.byCountry': 'Страна',
  'leaderboard.byAge': 'Возраст',
  'leaderboard.selectCountry': 'Выберите страну...',
  'leaderboard.under18': 'До 18',
  'leaderboard.age1825': '18-25',
  'leaderboard.age2635': '26-35',
  'leaderboard.age36plus': '36+',
  'leaderboard.sameAge': 'Игроки в возрасте {{age}}',

  // Public Lobbies / Play with Bot
  'lobbies.description': 'Присоединяйтесь к игре с ботами. Реальные игроки могут присоединиться в любой момент!',
  'lobbies.inProgress': 'Идёт игра',
  'lobbies.waiting': 'Ожидание',
  'lobbies.players': 'игроков',
  'lobbies.bots': 'бот',
  'lobbies.join': 'Войти',
  'lobbies.loading': 'Загрузка лобби...',

  // Auth
  'auth.login': 'Войти',
  'auth.register': 'Регистрация',
  'auth.username': 'Имя пользователя',
  'auth.password': 'Пароль',
  'auth.country': 'Страна',
  'auth.birthYear': 'Год рождения',
  'auth.logout': 'Выйти',
  'auth.editProfile': 'Редактировать профиль',
  'auth.saveProfile': 'Сохранить',
  'auth.invalidCredentials': 'Неверное имя пользователя или пароль',
  'auth.usernameTaken': 'Имя пользователя уже занято',

  // Profile (extended)
  'profile.country': 'Страна',
  'profile.birthYear': 'Год рождения',

  // Common
  'common.close': 'Закрыть',

  // Friends
  'friends.title': 'Друзья',
  'friends.search': 'Поиск пользователей...',
  'friends.addFriend': 'Добавить',
  'friends.removeFriend': 'Удалить друга',
  'friends.removeConfirm': 'Удалить {name} из друзей?',
  'friends.online': 'Онлайн',
  'friends.offline': 'Оффлайн',
  'friends.pending': 'Ожидание',
  'friends.inGame': 'В игре',
  'friends.invite': 'Пригласить',
  'friends.invited': 'Приглашён',
  'friends.requests': 'Запросы',
  'friends.incoming': 'Входящие',
  'friends.outgoing': 'Исходящие',
  'friends.accept': 'Принять',
  'friends.reject': 'Отклонить',
  'friends.decline': 'Отказать',
  'friends.cancel': 'Отмена',
  'friends.noFriends': 'Пока нет друзей. Найдите пользователей!',
  'friends.noRequests': 'Нет ожидающих запросов',
  'friends.loginRequired': 'Войдите, чтобы использовать систему друзей',
  'friends.requestSent': 'Запрос отправлен!',
  'friends.alreadyFriends': 'Уже в друзьях',
  'friends.noResults': 'Пользователи не найдены',
  'friends.gameInviteFrom': '{name} приглашает вас в игру!',
  'friends.inviteFriends': 'Пригласить друзей',
  'friends.noOnlineFriends': 'Нет друзей онлайн',
  'friends.searchMinChars': 'Введите минимум 2 символа',
  'friends.searchToSeeMore': 'Поищите, чтобы увидеть больше друзей',

  // Feedback / bug report
  'feedback.title': 'Отправить отзыв',
  'feedback.category': 'Категория',
  'feedback.category.bug': 'Ошибка',
  'feedback.category.feedback': 'Отзыв',
  'feedback.category.other': 'Другое',
  'feedback.message': 'Сообщение',
  'feedback.placeholder': 'Опишите проблему или поделитесь мыслями...',
  'feedback.submit': 'Отправить',
  'feedback.submitting': 'Отправка...',
  'feedback.successTitle': 'Спасибо!',
  'feedback.successBody': 'Ваш отзыв отправлен.',
  'feedback.close': 'Закрыть',
  'feedback.buttonLabel': 'Сообщить об ошибке или оставить отзыв',
  'feedback.errorGeneric': 'Не удалось отправить отзыв',
};
