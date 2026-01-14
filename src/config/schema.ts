import { z } from '@kokimoki/kit';

export const schema = z.object({
	// translations
	title: z.string().default('Color Sorting'),

	gameLobbyMd: z
		.string()
		.default(
			'# Color Sorting\n\n## How to Play\n\nEveryone will be assigned a color. Find other players with your color and scan their QR codes to form the largest group!'
		),
	connectionsMd: z.string().default('# Connections example'),
	sharedStateMd: z.string().default('# Shared State example'),
	sharedStatePlayerMd: z.string().default('# Shared State example for players'),

	players: z.string().default('Players'),
	online: z.string().default('Online'),
	offline: z.string().default('Offline'),
	stopButton: z.string().default('Stop Game'),
	loading: z.string().default('Loading...'),

	menuHelpMd: z
		.string()
		.default('# Help\nInstructions on how to play the game.'),

	createProfileMd: z.string().default('# Create your player profile'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Continue'),

	presenterLinkLabel: z.string().default('Presenter Link'),

	menuHelpAriaLabel: z.string().default('Open help drawer'),

	// Color Sorting Game Config
	colorAssignmentMd: z
		.string()
		.default(
			'# You are assigned this color\n\nFind other players with the same color and scan their QR codes to connect!'
		),
	colorSortingInstructionsMd: z
		.string()
		.default(
			'# Scan QR Codes\n\nFind players with your color and scan their QR codes to grow your group!'
		),
	assignColorsButton: z.string().default('Assign Colors & Start'),
	endRoundButton: z.string().default('End Round'),
	nextRoundButton: z.string().default('Next Round'),
	roundNumber: z.string().default('Round'),
	connectedWithCountMd: z.string().default('Connected with {count} others'),
	scanQrCodeButton: z.string().default('Scan QR Code'),
	roundDurationSeconds: z.number().min(10).max(180).default(90),
	numberOfColors: z.number().min(1).max(10).default(5),
	winnerAnnouncement: z
		.string()
		.default('🎉 {color} wins this round with {count} connected!'),
	roundResultsMd: z.string().default('Round {roundNumber} Results'),

	// Color naming (customization)
	colorNamingMd: z
		.string()
		.default(
			'# Name the Colors\n\nCustomize the color names for this game round. For example: Red → Marketing, Blue → Engineering.'
		),
	colorNameLabel: z.string().default('Color name'),
	numberOfColorsLabel: z.string().default('Number of Colors'),
	roundDurationLabel: z.string().default('Round duration (seconds)'),
	totalRoundsLabel: z.string().default('Total rounds'),
	logoUploadLabel: z.string().default('Upload logo (optional)'),
	saveColorNamesButton: z.string().default('Save Names & Start Game'),
	waitingForColorMd: z.string().default('waiting for color'),
	clickToAssignColorsAndStartMd: z
		.string()
		.default('Click to assign colors and start round 1'),
	clickToStartNextRoundMd: z.string().default('Click to start next round'),
	roundActivePlayersConnectingMd: z
		.string()
		.default('Round {roundNumber} is active. Players are connecting...'),

	// Final results
	finalResultsTitle: z.string().default('🏆 Final Results'),
	roundWinnerLabel: z.string().default('Round {roundNumber}'),
	playAgainButton: z.string().default('Play Again'),
	resetGameButton: z.string().default('Reset Game'),
	gameCompleteMessage: z.string().default('All rounds complete!'),
	winBonus: z.number().default(10),

	// Results view improvements
	cumulativeLeaderboardLabel: z.string().default('Cumulative Scores'),
	factionSizeLabel: z.string().default('Players Connected'),
	almostTimeMd: z.string().default('Almost time!'),
	totalConnectedLabel: z.string().default('Total connected')
});

export type Config = z.infer<typeof schema>;
