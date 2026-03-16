import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/i18n';
import CreateRoom from './CreateRoom';
import JoinRoom from './JoinRoom';
import AvailableRooms from './AvailableRooms';
import OngoingGames from './OngoingGames';
import AnimatedLogo from '@/components/UI/AnimatedLogo';
import RulesModal from '@/components/RulesModal';

type Tab = 'create' | 'join' | 'available' | 'ongoing';

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
];

/** Check synchronously if URL contains a room code. */
function hasRoomCodeInUrl(): boolean {
	return /^\/game\/[A-Z0-9]{4,8}$/i.test(window.location.pathname);
}

export default function HomePage() {
	const [tab, setTab] = useState<Tab>(() => (hasRoomCodeInUrl() ? 'join' : 'create'));
	const [showRules, setShowRules] = useState(false);
	const { roomId } = useGameStore();
	const { homeLayout } = useSettingsStore();
	const { t } = useTranslation();

	const isSidebar = homeLayout === 'sidebar';

	const renderTabContent = () => {
		const content = {
			create: <CreateRoom />,
			join: <JoinRoom />,
			available: <AvailableRooms />,
			ongoing: <OngoingGames />,
		};

		return (
			<AnimatePresence mode='wait'>
				<motion.div
					key={tab}
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.2 }}
				>
					{content[tab]}
				</motion.div>
			</AnimatePresence>
		);
	};

	return (
		<div className={`mx-auto mt-8 ${isSidebar ? 'max-w-[44rem]' : 'max-w-[29.5rem]'}`}>
			<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='text-center mb-8'>
				<h2 className='mb-2'>
					<AnimatedLogo text={t('app.title')} size='lg' animationKey={roomId ?? 'home'} />
				</h2>
				<p className='text-surface-500 dark:text-surface-400'>{t('app.subtitle')}</p>
				<button
					onClick={() => setShowRules(true)}
					className='mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors'
				>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						width='16'
						height='16'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
					>
						<circle cx='12' cy='12' r='10' />
						<path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' />
						<path d='M12 17h.01' />
					</svg>
					{t('rules.howToPlay')}
				</button>
			</motion.div>

			<AnimatePresence>{showRules && <RulesModal onClose={() => setShowRules(false)} />}</AnimatePresence>

			<div className='bg-white dark:bg-surface-800 rounded-card shadow-game-lg overflow-hidden'>
				{isSidebar ? (
					/* ── Sidebar layout ── */
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

						<div className='flex-1 p-6 overflow-y-auto'>{renderTabContent()}</div>
					</div>
				) : (
					/* ── Tabs layout ── */
					<>
						<div className='flex border-b border-surface-200 dark:border-surface-700 overflow-x-auto'>
							{tabsConfig.map(({ key, shortLabelKey, icon }) => (
								<button
									key={key}
									onClick={() => setTab(key)}
									className={`flex-1 py-3 px-2 text-sm font-semibold transition-colors relative flex items-center justify-center gap-1.5 min-w-0 whitespace-nowrap ${
										tab === key
											? 'text-primary-600 dark:text-primary-400'
											: 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
									}`}
								>
									<span className='hidden sm:inline'>{icon}</span>
									<span className='truncate text-xs sm:text-sm'>{t(shortLabelKey as any)}</span>
									{tab === key && (
										<motion.div
											layoutId='tab-indicator'
											className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500'
										/>
									)}
								</button>
							))}
						</div>

						<div className='p-6'>{renderTabContent()}</div>
					</>
				)}
			</div>
		</div>
	);
}
