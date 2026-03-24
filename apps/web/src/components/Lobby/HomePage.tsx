import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSocket } from '@/hooks/useSocket';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import CreateRoom from './CreateRoom';
import JoinRoom from './JoinRoom';
import AvailableRooms from './AvailableRooms';
import OngoingGames from './OngoingGames';
import Leaderboard from './Leaderboard';
import PublicLobbies from './PublicLobbies';
import AnimatedLogo from '@/components/UI/AnimatedLogo';

type Tab = 'create' | 'join' | 'available' | 'ongoing' | 'leaderboard' | 'lobbies';

interface TabConfig {
	key: Tab;
	labelKey: string;
	shortLabelKey: string;
	icon: React.ReactNode;
}

const tabsConfig: TabConfig[] = [
	{
		key: 'create',
		labelKey: 'home.createRoom',
		shortLabelKey: 'home.createShort',
		icon: (
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<path d='M12 5v14M5 12h14' />
			</svg>
		),
	},
	{
		key: 'join',
		labelKey: 'home.joinRoom',
		shortLabelKey: 'home.joinShort',
		icon: (
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<path d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4' />
				<polyline points='10 17 15 12 10 7' />
				<line x1='15' y1='12' x2='3' y2='12' />
			</svg>
		),
	},
	{
		key: 'available',
		labelKey: 'home.availableRooms',
		shortLabelKey: 'home.availableShort',
		icon: (
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
				<circle cx='9' cy='7' r='4' />
				<path d='M23 21v-2a4 4 0 0 0-3-3.87' />
				<path d='M16 3.13a4 4 0 0 1 0 7.75' />
			</svg>
		),
	},
	{
		key: 'ongoing',
		labelKey: 'home.ongoingGames',
		shortLabelKey: 'home.ongoingShort',
		icon: (
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<polygon points='5 3 19 12 5 21 5 3' />
			</svg>
		),
	},
	{
		key: 'lobbies',
		labelKey: 'home.publicLobbies',
		shortLabelKey: 'home.lobbiesShort',
		icon: (
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<rect x='3' y='11' width='18' height='10' rx='2' />
				<circle cx='9' cy='16' r='1' />
				<circle cx='15' cy='16' r='1' />
				<path d='M8 11V7a4 4 0 0 1 8 0v4' />
				<path d='M12 2v2' />
				<path d='M9 2h6' />
			</svg>
		),
	},
	{
		key: 'leaderboard',
		labelKey: 'leaderboard.title',
		shortLabelKey: 'leaderboard.title',
		icon: (
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<path d='M6 9H4.5a2.5 2.5 0 0 1 0-5H6' />
				<path d='M18 9h1.5a2.5 2.5 0 0 0 0-5H18' />
				<path d='M4 22h16' />
				<path d='M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' />
				<path d='M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' />
				<path d='M18 2H6v7a6 6 0 0 0 12 0V2Z' />
			</svg>
		),
	},
];

/** Check synchronously if URL contains a room code. */
function hasRoomCodeInUrl(): boolean {
	return /^\/game\/[A-Z0-9]{4,8}$/i.test(window.location.pathname);
}

export default function HomePage() {
	const [tab, setTab] = useState<Tab>(() => (hasRoomCodeInUrl() ? 'join' : 'create'));
	const [activeGameRoomId, setActiveGameRoomId] = useState<string | null>(null);
	const { roomId } = useGameStore();
	const { homeLayout } = useSettingsStore();
	const { isAuthenticated } = useAuthStore();
	const { t } = useTranslation();
	const { on, emit } = useSocket();
	const { joinRoom } = useGame();
	const persistentId = usePlayerStore((s) => s.persistentId);
	const nickname = usePlayerStore((s) => s.nickname);
	const avatar = usePlayerStore((s) => s.avatar);

	// Check for active game on mount
	useEffect(() => {
		if (!persistentId) return;
		emit('player:checkActiveGame', { persistentId });

		const unsub = on('player:activeGame', (data: { roomId: string | null }) => {
			setActiveGameRoomId(data.roomId);
		});
		return unsub;
	}, [persistentId, emit, on]);

	const handleRejoin = useCallback(() => {
		if (!activeGameRoomId) return;
		joinRoom(activeGameRoomId);
	}, [activeGameRoomId, joinRoom]);

	const isCompactTab = isAuthenticated && (tab === 'create' || tab === 'join');
	const contentMinH = isCompactTab ? 'min-h-[300px]' : 'min-h-[565px]';

	const isSidebar = homeLayout === 'sidebar';

	const renderTabContent = () => {
		const content = {
			create: <CreateRoom />,
			join: <JoinRoom />,
			available: <AvailableRooms />,
			ongoing: <OngoingGames />,
			lobbies: <PublicLobbies />,
			leaderboard: <Leaderboard />,
		};

		return (
			<AnimatePresence mode='wait' initial={false}>
				<motion.div
					key={tab}
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.2 }}
					className={isCompactTab ? 'h-full' : undefined}
				>
					{content[tab]}
				</motion.div>
			</AnimatePresence>
		);
	};

	return (
		<div className={`mx-auto my-auto sm:my-0 sm:mt-8 w-full ${isSidebar ? 'max-w-[44rem]' : 'max-w-[29.5rem]'}`}>
			{/* Logo section - hidden on mobile to save space */}
			<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='text-center mb-4 sm:mb-8 hidden sm:block'>
				<h2 className='mb-2'>
					<AnimatedLogo text={t('app.title')} size='lg' animationKey={roomId ?? 'home'} />
				</h2>
				<p className='text-surface-500 dark:text-surface-400'>{t('app.subtitle')}</p>
			</motion.div>

			{/* Active game rejoin banner */}
			<AnimatePresence>
				{activeGameRoomId && !roomId && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className='mb-3 bg-primary-500/10 dark:bg-primary-500/20 border border-primary-500/30 rounded-card px-4 py-3 flex items-center justify-between gap-3'
					>
						<div className='flex items-center gap-2'>
							<span className='relative flex h-2.5 w-2.5'>
								<span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75' />
								<span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500' />
							</span>
							<span className='text-sm font-medium text-primary-700 dark:text-primary-300'>
								{t('home.activeGame')}
							</span>
							<span className='text-xs text-surface-500 font-mono'>{activeGameRoomId}</span>
						</div>
						<button
							onClick={handleRejoin}
							className='px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-button transition-colors'
						>
							{t('home.rejoinGame')}
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			<motion.div layout transition={{ layout: { type: 'spring', stiffness: 120, damping: 24, mass: 0.8 } }} className='bg-white dark:bg-surface-800 rounded-card shadow-game-lg overflow-hidden'>
				{isSidebar ? (
					/* ── Sidebar layout: icon-only on mobile, icons+labels on md+ ── */
					<div className='flex min-h-[400px]'>
						<div className='w-12 md:w-[14.4rem] flex-shrink-0 border-r border-surface-200 dark:border-surface-700 py-2 px-1 md:px-2 space-y-1'>
							{tabsConfig.map(({ key, labelKey, icon }) => (
								<button
									key={key}
									onClick={() => setTab(key)}
									title={t(labelKey as any)}
									className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-0 md:px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
										tab === key
											? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
											: 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50'
									}`}
								>
									{icon}
									<span className='hidden md:inline truncate'>{t(labelKey as any)}</span>
								</button>
							))}
						</div>

						<div className={`flex-1 p-4 sm:p-6 overflow-y-auto ${contentMinH}`}>{renderTabContent()}</div>
					</div>
				) : (
					/* ── Tabs layout: icons-only on mobile, icons+labels on sm+ ── */
					<>
						<div className='flex border-b border-surface-200 dark:border-surface-700'>
							{tabsConfig.map(({ key, shortLabelKey, labelKey, icon }) => (
								<button
									key={key}
									onClick={() => setTab(key)}
									title={t(labelKey as any)}
									className={`flex-1 py-2.5 sm:py-3 px-2 text-sm font-semibold transition-colors relative flex items-center justify-center gap-1.5 min-w-0 ${
										tab === key
											? 'text-primary-600 dark:text-primary-400'
											: 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
									}`}
								>
									{icon}
									<span className='hidden sm:inline truncate text-sm'>{t(shortLabelKey as any)}</span>
									{tab === key && (
										<motion.div
											layoutId='tab-indicator'
											className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500'
										/>
									)}
								</button>
							))}
						</div>

						<div className={`p-4 sm:p-6 ${contentMinH}`}>{renderTabContent()}</div>
					</>
				)}
			</motion.div>
		</div>
	);
}
