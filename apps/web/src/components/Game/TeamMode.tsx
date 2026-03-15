import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import DrawingCanvas from '@/components/Canvas/DrawingCanvas';
import ToolBar from '@/components/Canvas/ToolBar';
import ColorPalette from '@/components/Canvas/ColorPalette';
import GuessingChat from './GuessingChat';
import Timer from './Timer';
import WordDisplay from './WordDisplay';
import ScoreBoard from './ScoreBoard';
import GameLeaveButton from '@/components/UI/GameLeaveButton';

export default function TeamMode() {
	const {
		phase,
		players,
		drawerId,
		teamADrawerId,
		teamBDrawerId,
		wordHint,
		wordOptions,
		timeLeft,
		currentRound,
		teamAScore,
		teamBScore,
		currentWord,
		isRedrawRound,
		settings,
	} = useGameStore();
	const teamAName = settings?.teamAName || 'Team A';
	const teamBName = settings?.teamBName || 'Team B';
	const { playerId, isSpectator } = usePlayerStore();
	const { selectWord } = useGame();
	const { t } = useTranslation();

	const currentPlayer = players.find((p) => p.id === playerId);
	const myTeam = currentPlayer?.team;
	const isTeamADrawer = !isSpectator && teamADrawerId === playerId;
	const isTeamBDrawer = !isSpectator && teamBDrawerId === playerId;
	const isDrawer = isTeamADrawer || isTeamBDrawer;

	// Determine which canvas is "mine" (large) vs opponent (PiP).
	// Spectators default to Team A as main view.
	const isMyTeamA = isSpectator || myTeam === 'A';
	const myTeamName = isMyTeamA ? teamAName : teamBName;
	const oppTeamName = isMyTeamA ? teamBName : teamAName;
	const myTeamColor = isMyTeamA ? 'text-team-a' : 'text-team-b';
	const oppTeamColor = isMyTeamA ? 'text-team-b' : 'text-team-a';
	const oppBorderColor = isMyTeamA ? 'border-team-b/40' : 'border-team-a/40';

	if (phase === 'game_end') {
		return <ScoreBoard />;
	}

	return (
		<div className='max-w-7xl mx-auto'>
			{/* Word Selection Modal */}
			<AnimatePresence>
				{phase === 'selecting_word' && isDrawer && wordOptions.length > 0 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
					>
						<motion.div
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.8, opacity: 0 }}
							className='bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6 max-w-md w-full'
						>
							<h3 className='text-lg font-bold text-center mb-4'>{t('game.chooseWord')}</h3>
							<div className='space-y-2'>
								{wordOptions.map((option, index) => (
									<motion.button
										key={index}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => selectWord(index)}
										className='w-full py-3 px-4 rounded-button bg-surface-50 dark:bg-surface-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-2 border-surface-200 dark:border-surface-600 hover:border-primary-500 transition-all text-left'
									>
										<span className='font-bold text-lg'>{option.word}</span>
									</motion.button>
								))}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Waiting for word selection (shown to non-drawers AND to team B drawer who doesn't pick the word) */}
			{phase === 'selecting_word' && !(isDrawer && wordOptions.length > 0) && (
				<div className='text-center py-8'>
					<motion.div
						animate={{ scale: [1, 1.05, 1] }}
						transition={{ repeat: Infinity, duration: 1.5 }}
						className='text-xl font-bold text-primary-600 dark:text-primary-400'
					>
						{t('game.choosingWord', { name: players.find((p) => p.id === teamADrawerId)?.nickname || '' })}
					</motion.div>
					<div className='mt-6'>
						<GameLeaveButton />
					</div>
				</div>
			)}

			{/* Team Scores Banner */}
			<div className='flex items-center justify-center gap-8 mb-4'>
				<div className='text-center'>
					<div className='text-xs font-bold text-team-a uppercase'>{teamAName}</div>
					<div className='text-2xl font-bold text-team-a'>{teamAScore}</div>
				</div>
				<div className='text-surface-400 font-bold'>{t('game.vs')}</div>
				<div className='text-center'>
					<div className='text-xs font-bold text-team-b uppercase'>{teamBName}</div>
					<div className='text-2xl font-bold text-team-b'>{teamBScore}</div>
				</div>
			</div>

			{/* Redraw Round Banner */}
			{isRedrawRound && (phase === 'drawing' || phase === 'selecting_word') && (
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					className='text-center mb-4 py-2 px-4 bg-accent-500/10 rounded-card border border-accent-500/30'
				>
					<span className='font-bold text-accent-600 dark:text-accent-400'>{t('game.redrawRound')}</span>
				</motion.div>
			)}

			{/* Spectator Badge */}
			{isSpectator && (phase === 'drawing' || phase === 'round_end' || phase === 'selecting_word') && (
				<div className='text-center mb-3'>
					<span className='inline-block px-3 py-1 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 text-sm font-semibold'>
						{t('spectator.badge')}
					</span>
				</div>
			)}

			{/* Main Game Layout */}
			{(phase === 'drawing' || phase === 'round_end') && (
				<div className='grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4'>
					<div className='space-y-3'>
						{/* Top Bar */}
						<div className='flex items-center justify-between bg-white dark:bg-surface-800 rounded-card shadow-game px-4 py-2'>
							<div className='text-sm text-surface-500'>{t('game.round', { number: currentRound })}</div>
							<WordDisplay
								hint={wordHint}
								word={isDrawer ? currentWord || '' : undefined}
								isDrawer={isDrawer}
							/>
							<Timer timeLeft={timeLeft} />
						</div>

						{/* Canvas Area — own team large, opponent PiP in corner */}
						<div className='relative'>
							{/* Own team canvas (full size) */}
							<div>
								<div className={`text-center text-sm font-bold ${myTeamColor} mb-2`}>{myTeamName}</div>
								<DrawingCanvas
									isDrawer={
										isMyTeamA
											? isTeamADrawer && phase === 'drawing'
											: isTeamBDrawer && phase === 'drawing'
									}
									isBlurred={false}
								/>
							</div>

							{/* Opponent canvas — picture-in-picture overlay (hidden on mobile) */}
							<div
								className={`absolute top-8 left-2 hidden md:block w-28 lg:w-32 rounded-lg border-2 ${oppBorderColor} shadow-game-lg overflow-hidden opacity-80 hover:opacity-100 transition-opacity z-10 pointer-events-none`}
							>
								<div
									className={`text-center text-[10px] font-bold ${oppTeamColor} py-0.5 bg-white/80 dark:bg-surface-800/80`}
								>
									{oppTeamName}
								</div>
								<DrawingCanvas isDrawer={false} isBlurred={!isSpectator} />
							</div>
						</div>

						{/* Drawing Tools */}
						{isDrawer && phase === 'drawing' && (
							<div className='flex flex-col sm:flex-row gap-3'>
								<ToolBar />
								<ColorPalette />
							</div>
						)}

						{/* Inline chat below canvas (tablet / mobile) */}
						<div className='lg:hidden h-[250px]'>
							<GuessingChat isDrawer={isDrawer} />
						</div>
					</div>

					{/* Right Sidebar - Chat (desktop) */}
					<div className='hidden lg:block h-[calc(100vh-200px)] min-h-[400px]'>
						<GuessingChat isDrawer={isDrawer} />
					</div>
				</div>
			)}
		</div>
	);
}
