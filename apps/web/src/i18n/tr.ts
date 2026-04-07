import type { Translations } from './types';

export const tr: Translations = {
  // App
  'app.title': 'DoodleDraw',
  'app.subtitle': 'Çiz, tahmin et ve arkadaşlarınla yarış!',

  // Home
  'home.createRoom': 'Oda Oluştur',
  'home.joinRoom': 'Odaya Katıl',
  'home.availableRooms': 'Açık Odalar',
  'home.ongoingGames': 'Devam Eden Oyunlar',
  'home.createShort': 'Oluştur',
  'home.joinShort': 'Katıl',
  'home.availableShort': 'Odalar',
  'home.ongoingShort': 'Devam',
  'home.publicLobbies': 'Botla Oyna',
  'home.lobbiesShort': 'Botlar',
  'home.layoutTabs': 'Sekme düzeni',
  'home.activeGame': 'Aktif bir oyununuz var!',
  'home.rejoinGame': 'Geri Dön',
  'home.layoutSidebar': 'Yan panel düzeni',

  // Create Room
  'create.gameMode': 'Oyun Modu',
  'create.classic': 'Klasik',
  'create.classicDesc': 'Herkes kendisi için',
  'create.teamBattle': 'Takım Savaşı',
  'create.teamBattleDesc': '2 takım yarışır',
  'create.nickname': 'Takma Ad',
  'create.nicknamePlaceholder': 'Takma adınızı girin...',
  'create.avatar': 'Avatar Seç',
  'create.showMore': 'Daha Fazla',
  'create.showLess': 'Daha Az',

  // Join Room
  'join.roomCode': 'Oda Kodu',

  // Lobby
  'lobby.roomCode': 'Oda Kodu',
  'lobby.clickToCopy': 'Kopyalamak için tıklayın',
  'lobby.classicMode': 'Klasik Mod',
  'lobby.teamBattle': 'Takım Savaşı',
  'lobby.players': 'Oyuncular',
  'lobby.settings': 'Ayarlar',
  'lobby.language': 'Dil',
  'lobby.difficulty': 'Zorluk',
  'lobby.easy': 'Kolay',
  'lobby.medium': 'Orta',
  'lobby.hard': 'Zor',
  'lobby.roundTime': 'Tur Süresi',
  'lobby.seconds': '{{count}} saniye',
  'lobby.rounds': 'Turlar',
  'lobby.nRounds': '{{count}} Tur',
  'lobby.leave': 'Ayrıl',
  'lobby.startGame': 'Oyunu Başlat',
  'lobby.needMorePlayers': '{{count}} oyuncu daha gerekli',
  'lobby.addBot': 'Bot Ekle',
  'lobby.teamAName': 'Takım A Adı',
  'lobby.teamBName': 'Takım B Adı',
  'lobby.hints': 'İpuçları',
  'lobby.hintsDesc': 'Kelimenin harflerini yavaş yavaş gösterin',
  'lobby.redrawRound': 'Yeniden Çizim Turu',
  'lobby.redrawRoundDesc': 'Tüm turlardan sonra önceki kelimeleri tekrar çizin',
  'lobby.leaveConfirmTitle': 'Odadan Ayrıl?',
  'lobby.leaveConfirmMessage': 'Bu odadan ayrılmak istediğinizden emin misiniz?',
  'lobby.confirmLeave': 'Ayrıl',
  'lobby.cancel': 'İptal',
  'lobby.starting': 'Başlıyor...',
  'lobby.cancelStart': 'İptal',

  // Player List
  'player.host': 'Ev Sahibi',
  'player.drawing': 'Çiziyor',
  'player.teamA': 'Takım A',
  'player.teamB': 'Takım B',
  'player.joinTeam': 'Katıl',

  // Game
  'game.round': 'Tur {{number}}',
  'game.chooseWord': 'Çizmek için bir kelime seçin!',
  'game.choosingWord': '{{name}} bir kelime seçiyor...',
  'game.wordWas': 'Kelime şuydu:',
  'game.yourWord': 'Kelimeniz:',
  'game.vs': 'VS',
  'game.redrawRound': 'Yeniden Çizim Turu!',

  // Chat
  'chat.title': 'Sohbet',
  'chat.guessPlaceholder': 'Tahmininizi yazın...',
  'chat.youreDrawing': 'Siz çiziyorsunuz!',
  'chat.guessedWord': '{{name}} kelimeyi bildi! (+{{points}})',
  'chat.isClose': '{{name}} yaklaştı!',
  'chat.lobbyPlaceholder': 'Bir mesaj yazın...',
  'chat.spectatorPlaceholder': 'İzleyiciler tahmin edemez...',

  // Spectator
  'spectator.badge': 'İzliyor',
  'spectator.spectate': 'İzle',

  // Score Board
  'score.gameOver': 'Oyun Bitti!',
  'score.winner': 'Kazanan!',
  'score.backToHome': 'Ana Sayfaya Dön',
  'score.noPlayers': 'Oyuncu yok',
  'score.rematch': 'Tekrar Oyna',
  'score.waitingForPlayers': 'Diğerleri bekleniyor...',
  'score.rematchStarting': 'Tekrar başlıyor!',

  // Tools
  'tool.pen': 'Kalem',
  'tool.eraser': 'Silgi',
  'tool.fill': 'Doldur',
  'tool.size': 'Boyut {{size}}',
  'tool.undo': 'Geri Al',
  'tool.clear': 'Temizle',

  // Settings
  'settings.title': 'Ayarlar',
  'settings.language': 'Dil',
  'settings.fontSize': 'Yazı Boyutu',
  'settings.fontStyle': 'Yazı Stili',
  'settings.soundEffects': 'Ses Efektleri',
  'settings.soundOn': 'Ses Açık',
  'settings.soundOff': 'Ses Kapalı',
  'settings.theme': 'Tema',
  'settings.homeLayout': 'Ana Sayfa Düzeni',
  'settings.standard': 'Standart',
  'settings.medium': 'Orta',
  'settings.large': 'Büyük',

  // Languages
  'lang.en': 'English',
  'lang.ka': 'ქართული (Georgian)',
  'lang.tr': 'Türkçe (Turkish)',
  'lang.ru': 'Русский (Russian)',

  // Rules
  'rules.howToPlay': 'Nasıl Oynanır',
  'rules.title': 'Nasıl Oynanır',
  'rules.close': 'Anladım!',
  'rules.overview': 'Bir oyuncu kelimeyi çizer, diğerleri tahmin etmeye çalışır. Ne kadar hızlı tahmin ederseniz o kadar çok puan kazanırsınız!',
  'rules.classic.title': 'Klasik Mod',
  'rules.classic.desc': 'Oyuncular sırayla çizer. Diğerleri tahmin eder. Puanlar hıza göre verilir — hızlı tahmin edin!',
  'rules.team.title': 'Takım Savaşı',
  'rules.team.desc': 'İki takım yarışır! Her iki takım aynı kelimeyi aynı anda çizer, ancak sadece kendi takımınızın tuvalini net görebilirsiniz. Rakip takımın tuvali bulanıktır.',
  'rules.drawing.title': 'Çizim İpuçları',
  'rules.drawing.desc': 'Kalem, silgi ve doldurma araçlarını kullanın. Fırça boyutunu ve renkleri değiştirin. İşlemleri geri alabilir ve tuvali temizleyebilirsiniz. Harf ve rakam yasaktır!',
  'rules.scoring.title': 'Puanlama',
  'rules.scoring.desc': 'Tahmin edenler hızlı cevaplar için daha fazla puan kazanır. Çizen de başkaları doğru tahmin ettiğinde puan alır. Takım modunda takım puanları toplanır.',
  'rules.difficulty.title': 'Zorluk Seviyeleri',
  'rules.difficulty.desc': 'Kolay — yaygın, basit kelimeler. Orta — daha az belirgin kelimeler. Zor — deneyimli oyuncular için nadir veya karmaşık kelimeler.',
  'rules.languages.title': 'Diller',
  'rules.languages.desc': 'Kelimeler İngilizce, Gürcüce, Türkçe ve Rusça olarak mevcuttur. Ev sahibi lobi ayarlarından kelime dilini seçer.',
  'rules.spectator.title': 'İzleyici Modu',
  'rules.spectator.desc': 'Devam eden herhangi bir oyuna izleyici olarak katılın! Her iki takımın çizimini izleyin, sohbeti takip edin, ancak tahmin edemez ve puan kazanamazsınız.',
  'rules.settings.title': 'Oda Ayarları',
  'rules.settings.desc': 'Ev sahibi tur süresini, tur sayısını, zorluğu, kelime dilini ayarlayabilir ve önceki kelimelerin tekrar çizildiği bonus turu etkinleştirebilir.',

  // Connection
  'connection.lost': 'Bağlantı kesildi',
  'connection.reconnecting': 'Yeniden bağlanıyor... (deneme {{attempt}})',
  'connection.failed': 'Yeniden bağlanma başarısız',
  'connection.reconnect': 'Yeniden Bağlan',
  'connection.disconnected': 'Çevrimdışı',
  'connection.playerDisconnected': '{{name}} bağlantısı kesildi',
  'connection.playerReconnected': '{{name}} yeniden bağlandı',

  // Player left
  'game.playerLeft': '{{name}} oyundan ayrıldı',
  'game.returnedToLobby': 'Oyun iptal edildi. Lobiye dönülüyor.',
  'game.playerLeftOk': 'OK',

  // Public Rooms
  'publicRooms.title': 'Herkese Açık Odalar',
  'publicRooms.empty': 'Açık oda yok. Bir tane oluştur!',
  'publicRooms.join': 'Katıl',
  'publicRooms.players': '{{count}}/{{max}}',
  'publicRooms.publicRoom': 'Herkese Açık Oda',
  'publicRooms.publicRoomDesc': 'Herkese açık odalar listesinde görünür',

  // Ongoing Games
  'ongoingGames.empty': 'Şu anda devam eden oyun yok.',
  'ongoingGames.spectate': 'İzle',
  'ongoingGames.round': 'Tur {{current}}/{{total}}',
  'ongoingGames.players': '{{count}} oyuncu',
  'ongoingGames.spectators': '{{count}} izleyici',
  'ongoingGames.phase.selecting_word': 'Seçiliyor',
  'ongoingGames.phase.drawing': 'Çiziliyor',
  'ongoingGames.phase.round_end': 'Tur Sonu',

  // Pagination
  'pagination.prev': 'Önceki',
  'pagination.next': 'Sonraki',
  'pagination.page': 'Sayfa {{current}} / {{total}}',

  // Chat (spectator)
  'chat.spectatorOnly': 'İzleyici sohbeti',
  'chat.expand': 'Sohbeti genişlet',

  // Theme
  'theme.switchToLight': 'Açık moda geç',
  'theme.switchToDark': 'Koyu moda geç',

  // Profile
  'profile.noData': 'Henüz profil verisi yok',
  'profile.gamesPlayed': 'Oyunlar',
  'profile.wins': 'Galibiyetler',
  'profile.winRate': 'Kazanma %',
  'profile.totalScore': 'Toplam Puan',
  'profile.correctGuesses': 'Tahminler',
  'profile.drawings': 'Çizimler',
  'profile.favoriteWord': 'Favori Kelime',

  // Leaderboard
  'leaderboard.title': 'Sıralama',
  'leaderboard.allTime': 'Tüm Zamanlar',
  'leaderboard.thisWeek': 'Bu Hafta',
  'leaderboard.noPlayers': 'Henüz oyuncu yok',
  'leaderboard.games': 'oyun',
  'leaderboard.wins': 'galibiyet',
  'leaderboard.score': 'puan',

  'leaderboard.byCountry': 'Ülke',
  'leaderboard.byAge': 'Yaş',
  'leaderboard.selectCountry': 'Ülke seçin...',
  'leaderboard.under18': '18 altı',
  'leaderboard.age1825': '18-25',
  'leaderboard.age2635': '26-35',
  'leaderboard.age36plus': '36+',
  'leaderboard.sameAge': '{{age}} yaşındaki oyuncular',

  // Public Lobbies / Play with Bot
  'lobbies.description': 'Botlarla oyuna katılın. Gerçek oyuncular her zaman katılabilir!',
  'lobbies.inProgress': 'Devam Ediyor',
  'lobbies.waiting': 'Bekliyor',
  'lobbies.players': 'oyuncu',
  'lobbies.bots': 'bot',
  'lobbies.join': 'Katıl',
  'lobbies.loading': 'Lobiler yükleniyor...',

  // Auth
  'auth.login': 'Giriş Yap',
  'auth.register': 'Kayıt Ol',
  'auth.username': 'Kullanıcı adı',
  'auth.password': 'Şifre',
  'auth.country': 'Ülke',
  'auth.birthYear': 'Doğum Yılı',
  'auth.logout': 'Çıkış Yap',
  'auth.editProfile': 'Profili Düzenle',
  'auth.saveProfile': 'Kaydet',
  'auth.invalidCredentials': 'Geçersiz kullanıcı adı veya şifre',
  'auth.usernameTaken': 'Kullanıcı adı zaten alınmış',

  // Profile (extended)
  'profile.country': 'Ülke',
  'profile.birthYear': 'Doğum Yılı',

  // Common
  'common.close': 'Kapat',

  // Friends
  'friends.title': 'Arkadaşlar',
  'friends.search': 'Kullanıcı ara...',
  'friends.addFriend': 'Ekle',
  'friends.removeFriend': 'Arkadaşı Sil',
  'friends.removeConfirm': '{name} arkadaşlardan silinsin mi?',
  'friends.online': 'Çevrimiçi',
  'friends.offline': 'Çevrimdışı',
  'friends.pending': 'Beklemede',
  'friends.inGame': 'Oyunda',
  'friends.invite': 'Davet Et',
  'friends.invited': 'Davet Edildi',
  'friends.requests': 'İstekler',
  'friends.incoming': 'Gelen',
  'friends.outgoing': 'Giden',
  'friends.accept': 'Kabul Et',
  'friends.reject': 'Reddet',
  'friends.decline': 'Reddet',
  'friends.cancel': 'İptal',
  'friends.noFriends': 'Henüz arkadaş yok. Kullanıcı arayın!',
  'friends.noRequests': 'Bekleyen istek yok',
  'friends.loginRequired': 'Arkadaş sistemini kullanmak için giriş yapın',
  'friends.requestSent': 'Arkadaşlık isteği gönderildi!',
  'friends.alreadyFriends': 'Zaten arkadaş',
  'friends.noResults': 'Kullanıcı bulunamadı',
  'friends.gameInviteFrom': '{name} sizi oyuna davet etti!',
  'friends.inviteFriends': 'Arkadaş Davet Et',
  'friends.noOnlineFriends': 'Çevrimiçi arkadaş yok',
  'friends.searchMinChars': 'En az 2 karakter yazın',
  'friends.searchToSeeMore': 'Daha fazla arkadaş görmek için arayın',
};
