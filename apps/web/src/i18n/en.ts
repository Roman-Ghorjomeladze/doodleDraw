export const en = {
	// App
	'app.title': 'DoodleDraw',
	'app.subtitle': 'Draw, guess, and compete with friends!',

	// Home
	'home.createRoom': 'Create Room',
	'home.joinRoom': 'Join Room',
	'home.availableRooms': 'Available Rooms',
	'home.ongoingGames': 'Ongoing Games',
	'home.createShort': 'Create',
	'home.joinShort': 'Join',
	'home.availableShort': 'Rooms',
	'home.ongoingShort': 'Ongoing',
	'home.publicLobbies': 'Play with Bot',
	'home.lobbiesShort': 'Bots',
	'home.layoutTabs': 'Tabs layout',
	'home.layoutSidebar': 'Sidebar layout',
	'home.activeGame': 'You have an active game!',
	'home.rejoinGame': 'Rejoin',

	// Create Room
	'create.gameMode': 'Game Mode',
	'create.classic': 'Classic',
	'create.classicDesc': 'Everyone for themselves',
	'create.teamBattle': 'Team Battle',
	'create.teamBattleDesc': '2 teams compete',
	'create.nickname': 'Nickname',
	'create.nicknamePlaceholder': 'Enter your nickname...',
	'create.avatar': 'Choose Avatar',
	'create.showMore': 'Show More',
	'create.showLess': 'Show Less',

	// Join Room
	'join.roomCode': 'Room Code',

	// Lobby
	'lobby.roomCode': 'Room Code',
	'lobby.clickToCopy': 'Click to copy',
	'lobby.classicMode': 'Classic Mode',
	'lobby.teamBattle': 'Team Battle',
	'lobby.players': 'Players',
	'lobby.settings': 'Settings',
	'lobby.language': 'Language',
	'lobby.difficulty': 'Difficulty',
	'lobby.easy': 'Easy',
	'lobby.medium': 'Medium',
	'lobby.hard': 'Hard',
	'lobby.roundTime': 'Round Time',
	'lobby.seconds': '{{count}} seconds',
	'lobby.rounds': 'Rounds',
	'lobby.nRounds': '{{count}} Round(s)',
	'lobby.leave': 'Leave',
	'lobby.startGame': 'Start Game',
	'lobby.needMorePlayers': 'Need {{count}} more player(s)',
	'lobby.addBot': 'Add Bot',
	'lobby.teamAName': 'Team A Name',
	'lobby.teamBName': 'Team B Name',
	'lobby.hints': 'Hints',
	'lobby.hintsDesc': 'Gradually reveal letters of the word',
	'lobby.redrawRound': 'Redraw Round',
	'lobby.redrawRoundDesc': 'After all rounds, redraw previous words',
	'lobby.leaveConfirmTitle': 'Leave Room?',
	'lobby.leaveConfirmMessage': 'Are you sure you want to leave this room?',
	'lobby.confirmLeave': 'Leave',
	'lobby.cancel': 'Cancel',
	'lobby.starting': 'Starting in...',
	'lobby.cancelStart': 'Cancel',

	// Player List
	'player.host': 'Host',
	'player.drawing': 'Drawing',
	'player.teamA': 'Team A',
	'player.teamB': 'Team B',
	'player.joinTeam': 'Join',

	// Game
	'game.round': 'Round {{number}}',
	'game.chooseWord': 'Choose a word to draw!',
	'game.choosingWord': '{{name}} is choosing a word...',
	'game.wordWas': 'The word was:',
	'game.yourWord': 'Your word:',
	'game.vs': 'VS',
	'game.redrawRound': 'Redraw Round!',

	// Chat
	'chat.title': 'Chat',
	'chat.guessPlaceholder': 'Type your guess...',
	'chat.youreDrawing': "You're drawing!",
	'chat.guessedWord': '{{name}} guessed the word! (+{{points}})',
	'chat.isClose': '{{name}} is close!',
	'chat.lobbyPlaceholder': 'Type a message...',
	'chat.spectatorPlaceholder': "Spectators can't guess...",

	// Spectator
	'spectator.badge': 'Spectating',
	'spectator.spectate': 'Spectate',

	// Score Board
	'score.gameOver': 'Game Over!',
	'score.winner': 'Winner!',
	'score.backToHome': 'Back to Home',
	'score.noPlayers': 'No players',
	'score.rematch': 'Rematch',
	'score.waitingForPlayers': 'Waiting for others...',
	'score.rematchStarting': 'Rematch starting!',

	// Tools
	'tool.pen': 'Pen',
	'tool.eraser': 'Eraser',
	'tool.fill': 'Fill',
	'tool.size': 'Size {{size}}',
	'tool.undo': 'Undo',
	'tool.clear': 'Clear',

	// Settings
	'settings.title': 'Settings',
	'settings.language': 'Language',
	'settings.fontSize': 'Font Size',
	'settings.fontStyle': 'Font Style',
	'settings.soundEffects': 'Sound Effects',
	'settings.soundOn': 'Sound On',
	'settings.soundOff': 'Sound Off',
	'settings.theme': 'Theme',
	'settings.homeLayout': 'Home Layout',
	'settings.standard': 'Standard',
	'settings.medium': 'Medium',
	'settings.large': 'Large',

	// Languages
	'lang.en': 'English',
	'lang.ka': 'ქართული (Georgian)',
	'lang.tr': 'Türkçe (Turkish)',
	'lang.ru': 'Русский (Russian)',

	// Rules
	'rules.howToPlay': 'How to Play',
	'rules.title': 'How to Play',
	'rules.close': 'Got it!',
	'rules.overview':
		'One player draws a word while others try to guess it. The faster you guess, the more points you earn!',
	'rules.classic.title': 'Classic Mode',
	'rules.classic.desc':
		'Players take turns drawing. Everyone else guesses. Points are awarded for speed — guess fast to score big!',
	'rules.team.title': 'Team Battle',
	'rules.team.desc':
		"Two teams compete! Both teams draw the same word simultaneously, but you can only see your own team's canvas clearly. The opposing team's canvas is blurred.",
	'rules.drawing.title': 'Drawing Tips',
	'rules.drawing.desc':
		'Use the pen, eraser, and fill tools. Change brush size and colors. You can undo strokes and clear the canvas. No letters or numbers allowed!',
	'rules.scoring.title': 'Scoring',
	'rules.scoring.desc':
		'Guessers earn more points for faster guesses. The drawer also earns points when others guess correctly. In team mode, team scores are combined.',
	'rules.difficulty.title': 'Difficulty Levels',
	'rules.difficulty.desc':
		'Easy — common, simple words. Medium — less obvious words that require more thought. Hard — rare or complex words for experienced players.',
	'rules.languages.title': 'Languages',
	'rules.languages.desc':
		'Words are available in English, Georgian, Turkish, and Russian. The host selects the word language in the lobby settings.',
	'rules.spectator.title': 'Spectator Mode',
	'rules.spectator.desc':
		'Join any ongoing game as a spectator! Watch both teams draw, follow the chat, but you cannot guess or earn points.',
	'rules.settings.title': 'Room Settings',
	'rules.settings.desc':
		'The host can adjust round time, number of rounds, difficulty, word language, and enable a bonus redraw round where players redraw previous words.',

	// Connection
	'connection.lost': 'Connection lost',
	'connection.reconnecting': 'Reconnecting... (attempt {{attempt}})',
	'connection.failed': 'Reconnection failed',
	'connection.reconnect': 'Reconnect',
	'connection.disconnected': 'Offline',
	'connection.playerDisconnected': '{{name}} lost connection',
	'connection.playerReconnected': '{{name}} reconnected',

	// Player left
	'game.playerLeft': '{{name}} left the game',
	'game.returnedToLobby': 'The game was cancelled. Returning to lobby.',
	'game.playerLeftOk': 'OK',

	// Public Rooms
	'publicRooms.title': 'Public Rooms',
	'publicRooms.empty': 'No public rooms available. Create one!',
	'publicRooms.join': 'Join',
	'publicRooms.players': '{{count}}/{{max}}',
	'publicRooms.publicRoom': 'Public Room',
	'publicRooms.publicRoomDesc': 'Visible in the public rooms list',

	// Ongoing Games
	'ongoingGames.empty': 'No games in progress right now.',
	'ongoingGames.spectate': 'Spectate',
	'ongoingGames.round': 'Round {{current}}/{{total}}',
	'ongoingGames.players': '{{count}} players',
	'ongoingGames.spectators': '{{count}} spectators',
	'ongoingGames.phase.selecting_word': 'Selecting',
	'ongoingGames.phase.drawing': 'Drawing',
	'ongoingGames.phase.round_end': 'Round End',

	// Pagination
	'pagination.prev': 'Prev',
	'pagination.next': 'Next',
	'pagination.page': 'Page {{current}} of {{total}}',

	// Chat (spectator)
	'chat.spectatorOnly': 'Spectator chat',
	'chat.expand': 'Expand chat',

	// Theme
	'theme.switchToLight': 'Switch to light mode',
	'theme.switchToDark': 'Switch to dark mode',

	// Profile
	'profile.noData': 'No profile data yet',
	'profile.gamesPlayed': 'Games',
	'profile.wins': 'Wins',
	'profile.winRate': 'Win Rate',
	'profile.totalScore': 'Total Score',
	'profile.correctGuesses': 'Guesses',
	'profile.drawings': 'Drawings',
	'profile.favoriteWord': 'Favorite Word',

	// Leaderboard
	'leaderboard.title': 'Leaderboard',
	'leaderboard.allTime': 'All Time',
	'leaderboard.thisWeek': 'This Week',
	'leaderboard.noPlayers': 'No players yet',
	'leaderboard.games': 'games',
	'leaderboard.wins': 'wins',
	'leaderboard.score': 'score',
	'leaderboard.byCountry': 'Country',
	'leaderboard.byAge': 'Age',
	'leaderboard.selectCountry': 'Select country...',
	'leaderboard.under18': 'Under 18',
	'leaderboard.age1825': '18-25',
	'leaderboard.age2635': '26-35',
	'leaderboard.age36plus': '36+',
	'leaderboard.sameAge': 'Players aged {{age}}',

	// Public Lobbies / Play with Bot
	'lobbies.description': 'Jump into an always-on game with bots. Real players can join anytime!',
	'lobbies.inProgress': 'In Progress',
	'lobbies.waiting': 'Waiting',
	'lobbies.players': 'players',
	'lobbies.bots': 'bot',
	'lobbies.join': 'Join',
	'lobbies.loading': 'Loading lobbies...',

	// Auth
	'auth.login': 'Log In',
	'auth.register': 'Register',
	'auth.username': 'Username',
	'auth.password': 'Password',
	'auth.country': 'Country',
	'auth.birthYear': 'Birth Year',
	'auth.logout': 'Log Out',
	'auth.editProfile': 'Edit Profile',
	'auth.saveProfile': 'Save',
	'auth.invalidCredentials': 'Invalid username or password',
	'auth.usernameTaken': 'Username already taken',

	// Profile (extended)
	'profile.country': 'Country',
	'profile.birthYear': 'Birth Year',

	// Common
	'common.close': 'Close',

	// Friends
	'friends.title': 'Friends',
	'friends.search': 'Search users...',
	'friends.addFriend': 'Add Friend',
	'friends.removeFriend': 'Remove Friend',
	'friends.removeConfirm': 'Remove {name} from friends?',
	'friends.online': 'Online',
	'friends.offline': 'Offline',
	'friends.pending': 'Pending',
	'friends.inGame': 'In Game',
	'friends.invite': 'Invite',
	'friends.invited': 'Invited',
	'friends.requests': 'Requests',
	'friends.incoming': 'Incoming',
	'friends.outgoing': 'Outgoing',
	'friends.accept': 'Accept',
	'friends.reject': 'Reject',
	'friends.decline': 'Decline',
	'friends.cancel': 'Cancel',
	'friends.noFriends': 'No friends yet. Search for users to add!',
	'friends.noRequests': 'No pending requests',
	'friends.loginRequired': 'Log in to use the friends system',
	'friends.requestSent': 'Friend request sent!',
	'friends.alreadyFriends': 'Already friends',
	'friends.noResults': 'No users found',
	'friends.gameInviteFrom': '{name} invited you to play!',
	'friends.inviteFriends': 'Invite Friends',
	'friends.noOnlineFriends': 'No friends online',
	'friends.searchMinChars': 'Type at least 2 characters',
	'friends.searchToSeeMore': 'Search to see more friends',

	// Feedback / bug report
	'feedback.title': 'Send feedback',
	'feedback.category': 'Category',
	'feedback.category.bug': 'Bug',
	'feedback.category.feedback': 'Feedback',
	'feedback.category.other': 'Other',
	'feedback.message': 'Message',
	'feedback.placeholder': 'Describe the issue or share your thoughts...',
	'feedback.submit': 'Send feedback',
	'feedback.submitting': 'Sending...',
	'feedback.successTitle': 'Thanks!',
	'feedback.successBody': 'Your feedback has been sent.',
	'feedback.close': 'Close',
	'feedback.buttonLabel': 'Report a bug or send feedback',
	'feedback.errorGeneric': 'Failed to submit feedback',
} as const;
