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
	startButton: z.string().default('Start Game'),
	stopButton: z.string().default('Stop Game'),
	loading: z.string().default('Loading...'),

	menuHelpMd: z
		.string()
		.default('# Help\nInstructions on how to play the game.'),

	createProfileMd: z.string().default('# Create your player profile'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Continue'),

	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Link'),

	togglePresenterQrButton: z.string().default('Toggle Presenter QR'),

	menuAriaLabel: z.string().default('Open menu drawer'),
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
	alreadyConnectedMd: z.string().default('Already connected to this player'),
	scanQrCodeButton: z.string().default('Scan QR Code'),
	colorRed: z.string().default('Ruby'),
	colorBlue: z.string().default('Sapphire'),
	colorGreen: z.string().default('Emerald'),
	colorYellow: z.string().default('Gold'),
	roundDurationSeconds: z.number().default(90),
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
	roundDurationLabel: z.string().default('Round duration (seconds)'),
	totalRoundsLabel: z.string().default('Total rounds'),
	logoUploadLabel: z.string().default('Upload logo (optional)'),
	saveColorNamesButton: z.string().default('Save Names & Start Game'),
	editColorNamesButton: z.string().default('Edit Color Names'),

	// Final results
	finalResultsTitle: z.string().default('🏆 Final Results'),
	roundWinnerLabel: z.string().default('Round {roundNumber}'),
	connectionsLabel: z.string().default('{count} connections'),
	playAgainButton: z.string().default('Play Again'),
	gameCompleteMessage: z.string().default('All rounds complete!')
});

export type Config = z.infer<typeof schema>;
