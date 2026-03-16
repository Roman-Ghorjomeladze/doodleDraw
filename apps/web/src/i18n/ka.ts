import type { Translations } from './types';

export const ka: Translations = {
	// App
	'app.title': 'DoodleDraw',
	'app.subtitle': 'დახატე, გამოიცანი და შეეჯიბრე მეგობრებს!',

	// Home
	'home.createRoom': 'ოთახის შექმნა',
	'home.joinRoom': 'ოთახში შესვლა',
	'home.availableRooms': 'საჯარო ოთახები',
	'home.ongoingGames': 'მიმდინარე თამაშები',
	'home.createShort': 'შექმნა',
	'home.joinShort': 'შესვლა',
	'home.availableShort': 'ოთახები',
	'home.ongoingShort': 'მიმდინარე',
	'home.layoutTabs': 'ჩანართების განლაგება',
	'home.layoutSidebar': 'გვერდითი პანელი',

	// Create Room
	'create.gameMode': 'თამაშის რეჟიმი',
	'create.classic': 'კლასიკური',
	'create.classicDesc': 'ყველა თავისთვის',
	'create.teamBattle': 'გუნდური ბრძოლა',
	'create.teamBattleDesc': '2 გუნდი ეჯიბრება',
	'create.nickname': 'მეტსახელი',
	'create.nicknamePlaceholder': 'შეიყვანეთ მეტსახელი...',
	'create.avatar': 'აირჩიეთ ავატარი',
	'create.showMore': 'მეტის ჩვენება',
	'create.showLess': 'ნაკლების ჩვენება',

	// Join Room
	'join.roomCode': 'ოთახის კოდი',

	// Lobby
	'lobby.roomCode': 'ოთახის კოდი',
	'lobby.clickToCopy': 'დააჭირეთ კოპირებისთვის',
	'lobby.classicMode': 'კლასიკური რეჟიმი',
	'lobby.teamBattle': 'გუნდური ბრძოლა',
	'lobby.players': 'მოთამაშეები',
	'lobby.settings': 'პარამეტრები',
	'lobby.language': 'ენა',
	'lobby.difficulty': 'სირთულე',
	'lobby.easy': 'მარტივი',
	'lobby.medium': 'საშუალო',
	'lobby.hard': 'რთული',
	'lobby.roundTime': 'რაუნდის დრო',
	'lobby.seconds': '{{count}} წამი',
	'lobby.rounds': 'რაუნდები',
	'lobby.nRounds': '{{count}} რაუნდი',
	'lobby.leave': 'გასვლა',
	'lobby.startGame': 'თამაშის დაწყება',
	'lobby.needMorePlayers': 'საჭიროა კიდევ {{count}} მოთამაშე',
	'lobby.teamAName': 'გუნდი A-ს სახელი',
	'lobby.teamBName': 'გუნდი B-ს სახელი',
	'lobby.hints': 'მინიშნებები',
	'lobby.hintsDesc': 'თანდათან გამოაჩინეთ სიტყვის ასოები',
	'lobby.redrawRound': 'ხელახალი ხატვის რაუნდი',
	'lobby.redrawRoundDesc': 'ყველა რაუნდის შემდეგ, ხელახლა დახატეთ წინა სიტყვები',
	'lobby.leaveConfirmTitle': 'ოთახიდან გასვლა?',
	'lobby.leaveConfirmMessage': 'ნამდვილად გსურთ ოთახიდან გასვლა?',
	'lobby.confirmLeave': 'გასვლა',
	'lobby.cancel': 'გაუქმება',
	'lobby.starting': 'იწყება...',
	'lobby.cancelStart': 'გაუქმება',

	// Player List
	'player.host': 'მასპინძელი',
	'player.drawing': 'ხატავს',
	'player.teamA': 'გუნდი A',
	'player.teamB': 'გუნდი B',
	'player.joinTeam': 'შეუერთდი',

	// Game
	'game.round': 'რაუნდი {{number}}',
	'game.chooseWord': 'აირჩიეთ სიტყვა დასახატად!',
	'game.choosingWord': '{{name}} ირჩევს სიტყვას...',
	'game.wordWas': 'სიტყვა იყო:',
	'game.yourWord': 'თქვენი სიტყვა:',
	'game.vs': 'VS',
	'game.redrawRound': 'ხელახალი ხატვის რაუნდი!',

	// Chat
	'chat.title': 'ჩატი',
	'chat.guessPlaceholder': 'შეიყვანეთ თქვენი გამოცნობა...',
	'chat.youreDrawing': 'თქვენ ხატავთ!',
	'chat.guessedWord': '{{name}}-მ გამოიცნო სიტყვა! (+{{points}})',
	'chat.isClose': '{{name}} ახლოსაა!',
	'chat.lobbyPlaceholder': 'დაწერეთ შეტყობინება...',
	'chat.spectatorPlaceholder': 'მაყურებლებს არ შეუძლიათ გამოცნობა...',

	// Spectator
	'spectator.badge': 'მაყურებელი',
	'spectator.spectate': 'ყურება',

	// Score Board
	'score.gameOver': 'თამაში დასრულდა!',
	'score.winner': 'გამარჯვებული!',
	'score.backToHome': 'მთავარ გვერდზე დაბრუნება',
	'score.noPlayers': 'მოთამაშეები არ არიან',

	// Tools
	'tool.pen': 'კალამი',
	'tool.eraser': 'საშლელი',
	'tool.fill': 'შევსება',
	'tool.size': 'ზომა {{size}}',
	'tool.undo': 'გაუქმება',
	'tool.clear': 'გასუფთავება',

	// Settings
	'settings.title': 'პარამეტრები',
	'settings.language': 'ენა',
	'settings.fontSize': 'შრიფტის ზომა',
	'settings.fontStyle': 'შრიფტის სტილი',
	'settings.soundEffects': 'ხმოვანი ეფექტები',
	'settings.soundOn': 'ხმა ჩართულია',
	'settings.soundOff': 'ხმა გამორთულია',
	'settings.homeLayout': 'მთავარი განლაგება',
	'settings.standard': 'სტანდარტული',
	'settings.medium': 'საშუალო',
	'settings.large': 'დიდი',

	// Languages
	'lang.en': 'English',
	'lang.ka': 'ქართული (Georgian)',
	'lang.tr': 'Türkçe (Turkish)',
	'lang.ru': 'Русский (Russian)',

	// Rules
	'rules.howToPlay': 'როგორ ვითამაშოთ',
	'rules.title': 'როგორ ვითამაშოთ',
	'rules.close': 'გასაგებია!',
	'rules.overview':
		'ერთი მოთამაშე ხატავს სიტყვას, დანარჩენები ცდილობენ გამოიცნონ. რაც უფრო სწრაფად გამოიცნობთ, მით მეტ ქულას მიიღებთ!',
	'rules.classic.title': 'კლასიკური რეჟიმი',
	'rules.classic.desc':
		'მოთამაშეები რიგრიგობით ხატავენ. დანარჩენები გამოიცნობენ. ქულები სისწრაფეზეა დამოკიდებული — გამოიცანით სწრაფად!',
	'rules.team.title': 'გუნდური ბრძოლა',
	'rules.team.desc':
		'ორი გუნდი ეჯიბრება! ორივე გუნდი ერთდროულად ხატავს ერთსა და იმავე სიტყვას, მაგრამ მხოლოდ თქვენი გუნდის ტილოს ხედავთ. მოწინააღმდეგის ტილო ბუნდოვანია.',
	'rules.drawing.title': 'ხატვის რჩევები',
	'rules.drawing.desc':
		'გამოიყენეთ კალამი, საშლელი და შევსების ხელსაწყოები. შეცვალეთ ფუნჯის ზომა და ფერები. შეგიძლიათ გააუქმოთ მოქმედება და გაასუფთავოთ ტილო. ასოები და ციფრები აკრძალულია!',
	'rules.scoring.title': 'ქულები',
	'rules.scoring.desc':
		'გამომცნობები მეტ ქულას იღებენ სწრაფი პასუხისთვის. მხატვარიც იღებს ქულებს, როცა სხვები გამოიცნობენ. გუნდურ რეჟიმში გუნდის ქულები ჯამდება.',
	'rules.difficulty.title': 'სირთულის დონეები',
	'rules.difficulty.desc':
		'მარტივი — გავრცელებული, მარტივი სიტყვები. საშუალო — ნაკლებად აშკარა სიტყვები. რთული — იშვიათი ან რთული სიტყვები გამოცდილი მოთამაშეებისთვის.',
	'rules.languages.title': 'ენები',
	'rules.languages.desc':
		'სიტყვები ხელმისაწვდომია ინგლისურად, ქართულად, თურქულად და რუსულად. მასპინძელი ირჩევს სიტყვების ენას ლობის პარამეტრებში.',
	'rules.spectator.title': 'მაყურებლის რეჟიმი',
	'rules.spectator.desc':
		'შეუერთდით ნებისმიერ მიმდინარე თამაშს მაყურებლის სახით! უყურეთ ორივე გუნდის ხატვას, თვალყური ადევნეთ ჩატს, მაგრამ ვერ გამოიცნობთ და ვერ მიიღებთ ქულებს.',
	'rules.settings.title': 'ოთახის პარამეტრები',
	'rules.settings.desc':
		'მასპინძელს შეუძლია შეცვალოს რაუნდის დრო, რაუნდების რაოდენობა, სირთულე, სიტყვების ენა და ჩართოს ბონუს ხელახალი ხატვის რაუნდი.',

	// Connection
	'connection.lost': 'კავშირი გაწყდა',
	'connection.reconnecting': 'ხელახალი დაკავშირება... (მცდელობა {{attempt}})',
	'connection.failed': 'ხელახალი დაკავშირება ვერ მოხერხდა',
	'connection.reconnect': 'ხელახლა დაკავშირება',
	'connection.disconnected': 'გათიშული',
	'connection.playerDisconnected': '{{name}} გათიშულია',
	'connection.playerReconnected': '{{name}} ხელახლა დაუკავშირდა',

	// Player left
	'game.playerLeft': '{{name}} თამაშიდან გავიდა',
	'game.returnedToLobby': 'თამაში გაუქმდა. ლობიში დაბრუნება.',
	'game.playerLeftOk': 'OK',

	// Public Rooms
	'publicRooms.title': 'საჯარო ოთახები',
	'publicRooms.empty': 'საჯარო ოთახები არ არის. შექმენი შენი!',
	'publicRooms.join': 'შესვლა',
	'publicRooms.players': '{{count}}/{{max}}',
	'publicRooms.publicRoom': 'საჯარო ოთახი',
	'publicRooms.publicRoomDesc': 'ჩანს საჯარო ოთახების სიაში',

	// Ongoing Games
	'ongoingGames.empty': 'ამჟამად მიმდინარე თამაშები არ არის.',
	'ongoingGames.spectate': 'ყურება',
	'ongoingGames.round': 'რაუნდი {{current}}/{{total}}',
	'ongoingGames.players': '{{count}} მოთამაშე',
	'ongoingGames.spectators': '{{count}} მაყურებელი',
	'ongoingGames.phase.selecting_word': 'სიტყვის არჩევა',
	'ongoingGames.phase.drawing': 'ხატვა',
	'ongoingGames.phase.round_end': 'რაუნდის დასასრული',

	// Pagination
	'pagination.prev': 'წინა',
	'pagination.next': 'შემდეგი',
	'pagination.page': 'გვერდი {{current}} / {{total}}',

	// Chat (spectator)
	'chat.spectatorOnly': 'მაყურებლების ჩატი',

	// Theme
	'theme.switchToLight': 'ღია რეჟიმზე გადართვა',
	'theme.switchToDark': 'მუქ რეჟიმზე გადართვა',
};
