import { useState } from 'react';
import { motion } from 'motion/react';
import { useGame } from '@/hooks/useGame';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n';
import { AVATAR_SEEDS, EXTRA_AVATAR_SEEDS } from '@doodledraw/shared';
import type { GameMode } from '@doodledraw/shared';
import Avatar from '@/components/Avatar';

export default function CreateRoom() {
	const { nickname, avatar, setNickname, setAvatar } = usePlayerStore();
	const { isAuthenticated } = useAuthStore();
	const { createRoom } = useGame();
	const [mode, setMode] = useState<GameMode>('classic');
	const [isPublic, setIsPublic] = useState(false);
	const [showMore, setShowMore] = useState(false);
	const { t } = useTranslation();

	const handleCreate = () => {
		if (!nickname.trim()) return;
		createRoom(mode, { isPublic });
	};

	const gameModeSelector = (
		<div>
			<label className='text-sm font-semibold text-surface-600 dark:text-surface-400 mb-1.5 sm:mb-2 block'>
				{t('create.gameMode')}
			</label>
			<div className='flex gap-2'>
				{(['classic', 'team'] as GameMode[]).map((m) => (
					<motion.button
						key={m}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => setMode(m)}
						className={`flex-1 py-2 sm:py-3 px-4 rounded-button font-semibold transition-all ${
							mode === m
								? 'bg-primary-500 text-white shadow-md'
								: 'bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
						}`}
					>
						{m === 'classic' ? t('create.classic') : t('create.teamBattle')}
						<div className={`text-xs mt-1 ${mode === m ? 'text-primary-200' : 'text-surface-500'}`}>
							{m === 'classic' ? t('create.classicDesc') : t('create.teamBattleDesc')}
						</div>
					</motion.button>
				))}
			</div>
		</div>
	);

	const publicToggle = (
		<label className='flex items-center gap-2 cursor-pointer'>
			<input
				type='checkbox'
				checked={isPublic}
				onChange={(e) => setIsPublic(e.target.checked)}
				className='w-4 h-4 rounded accent-primary-500'
			/>
			<span className='text-sm font-semibold text-surface-600 dark:text-surface-400'>
				{t('publicRooms.publicRoom')}
			</span>
			<span className='text-xs text-surface-400 dark:text-surface-500'>
				— {t('publicRooms.publicRoomDesc')}
			</span>
		</label>
	);

	const createButton = (
		<motion.button
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			onClick={handleCreate}
			disabled={!nickname.trim()}
			className='w-full py-2.5 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-button shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all'
		>
			{t('home.createRoom')}
		</motion.button>
	);

	if (isAuthenticated) {
		return (
			<div className='flex flex-col justify-between h-full min-h-[300px] w-full'>
				{/* Game mode + public toggle at top */}
				<div className='space-y-5'>
					{gameModeSelector}
					{publicToggle}
				</div>

				{/* Create button pinned at bottom */}
				<div className='pt-4'>
					{createButton}
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-4 sm:space-y-5 w-full'>
			{gameModeSelector}

			{/* Nickname + Avatar */}
			<div>
				<label className='text-sm font-semibold text-surface-600 dark:text-surface-400 mb-1.5 sm:mb-2 block'>
					{t('create.nickname')}
				</label>
				<input
					type='text'
					value={nickname}
					onChange={(e) => setNickname(e.target.value)}
					placeholder={t('create.nicknamePlaceholder')}
					maxLength={20}
					className='w-full px-4 py-2 sm:py-2.5 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all'
				/>
			</div>

			<div>
				<label className='text-sm font-semibold text-surface-600 dark:text-surface-400 mb-1.5 sm:mb-2 block'>
					{t('create.avatar')}
				</label>
				<div className='grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2 justify-items-center'>
					{AVATAR_SEEDS.map((seed) => (
						<motion.button
							key={seed}
							whileHover={{ scale: 1.15 }}
							whileTap={{ scale: 0.9 }}
							onClick={() => setAvatar(seed)}
							className={`w-9 h-9 rounded-full transition-all p-0.5 ${
								avatar === seed
									? 'ring-2 ring-offset-2 ring-primary-500 bg-primary-100 dark:bg-primary-900/30'
									: ''
							}`}
						>
							<Avatar seed={seed} size={32} className='w-full h-full' />
						</motion.button>
					))}
				</div>
				{showMore && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						className='grid grid-cols-4 sm:grid-cols-8 gap-2 justify-items-center mt-2'
					>
						{EXTRA_AVATAR_SEEDS.map((seed) => (
							<motion.button
								key={seed}
								whileHover={{ scale: 1.15 }}
								whileTap={{ scale: 0.9 }}
								onClick={() => setAvatar(seed)}
								className={`w-9 h-9 rounded-full transition-all p-0.5 ${
									avatar === seed
										? 'ring-2 ring-offset-2 ring-primary-500 bg-primary-100 dark:bg-primary-900/30'
										: ''
								}`}
							>
								<Avatar seed={seed} size={32} className='w-full h-full' />
							</motion.button>
						))}
					</motion.div>
				)}
				<button
					onClick={() => setShowMore(!showMore)}
					className='mt-2 text-xs font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors'
				>
					{showMore ? t('create.showLess') : t('create.showMore')}
				</button>
			</div>

			{publicToggle}
			{createButton}
		</div>
	);
}
