import { QrScanner } from '@/components/qr-scanner';
import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { factionActions } from '@/state/actions/faction-actions';
import {
	factionsStore,
	getFactionData,
	parseEdgeKey
} from '@/state/stores/factions-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { getColorClass } from '@/utils/color-utils';
import {
	buildAdjacencyList,
	findConnectedComponent
} from '@/utils/graph-utils';
import { useSnapshot } from '@kokimoki/app';
import { KmQrCode } from '@kokimoki/shared';
import { CheckCircle, Info, Scan, XCircle } from 'lucide-react';
import * as React from 'react';
import Markdown from 'react-markdown';

// Inner component that requires playerColor to be defined
const ColorSortingViewInner: React.FC<{ playerColor: ColorName }> = ({
	playerColor
}) => {
	const { colorNames, playerShortCodes, playerColors } = useSnapshot(
		globalStore.proxy
	);
	const [showScanner, setShowScanner] = React.useState(false);
	const [feedback, setFeedback] = React.useState<string | null>(null);
	const [feedbackType, setFeedbackType] = React.useState<
		'success' | 'error' | 'info'
	>('info');

	// Get faction data from unified store (no dynamic store needed)
	const factionsSnapshot = useSnapshot(factionsStore.proxy);
	const factionData = getFactionData(factionsSnapshot, playerColor);

	// Add this player to the faction on mount
	React.useEffect(() => {
		factionActions.joinFaction(playerColor, kmClient.id).catch(console.error);
	}, [playerColor]);

	// Calculate this player's specific faction size using graph utilities
	const playerCount = React.useMemo(() => {
		const edges = factionData.edges;
		const edgeKeys = Object.keys(edges);
		if (edgeKeys.length === 0) return 1; // Just this player
		const adjacencyList = buildAdjacencyList(edgeKeys, parseEdgeKey);
		const component = findConnectedComponent(kmClient.id, adjacencyList);
		return component.size > 0 ? component.size : 1;
	}, [factionData.edges]);

	// Get player's short code for simpler QR (6 chars vs full client ID)
	const myShortCode = playerShortCodes[kmClient.id] || kmClient.id;

	// Generate simpler QR code data: just shortCode and color (no URL)
	const qrCodeData = `${myShortCode}:${playerColor}`;

	// Create reverse lookup: shortCode -> clientId
	const shortCodeToClientId = React.useMemo(() => {
		const lookup: Record<string, string> = {};
		for (const [clientId, shortCode] of Object.entries(playerShortCodes)) {
			lookup[shortCode] = clientId;
		}
		return lookup;
	}, [playerShortCodes]);

	const handleQrScan = async (scannedData: string) => {
		try {
			let scannedClientId: string | null = null;
			let scannedColor: string | null = null;

			// Try new short code format first: "SHORTCODE:color"
			if (scannedData.includes(':') && !scannedData.includes('://')) {
				const [shortCode, color] = scannedData.split(':');
				scannedClientId = shortCodeToClientId[shortCode] || null;
				scannedColor = color || null;

				if (!scannedClientId) {
					setFeedbackType('error');
					setFeedback(config.invalidQrCodeMd);
					setTimeout(() => setFeedback(null), 2000);
					setShowScanner(false);
					return;
				}
			}
			// Legacy URL format: "...?playerCode=xxx&color=yyy"
			else if (scannedData.includes('playerCode=')) {
				try {
					const url = new URL(scannedData);
					scannedClientId = url.searchParams.get('playerCode');
					scannedColor = url.searchParams.get('color');
				} catch {
					setFeedbackType('error');
					setFeedback(config.invalidQrCodeMd);
					setTimeout(() => setFeedback(null), 2000);
					setShowScanner(false);
					return;
				}
			} else {
				// Unknown format
				setFeedbackType('error');
				setFeedback(config.invalidQrCodeMd);
				setTimeout(() => setFeedback(null), 2000);
				setShowScanner(false);
				return;
			}

			// Validate: both players must have the same color
			if (scannedColor && scannedColor !== playerColor) {
				setFeedbackType('error');
				setFeedback(
					config.wrongColorMd
						.replace(
							'{color}',
							colorNames[scannedColor as ColorName] || scannedColor
						)
						.replace('{yourColor}', colorNames[playerColor])
				);
				setTimeout(() => setFeedback(null), 3000);
				setShowScanner(false);
				return;
			}

			// Validate clientId was found
			if (!scannedClientId) {
				setFeedbackType('error');
				setFeedback(config.invalidQrCodeMd);
				setTimeout(() => setFeedback(null), 2000);
				setShowScanner(false);
				return;
			}

			// Verify scanned player has same color (double-check against actual state)
			const scannedPlayerColor = playerColors[scannedClientId];
			if (scannedPlayerColor && scannedPlayerColor !== playerColor) {
				setFeedbackType('error');
				setFeedback(
					config.wrongColorMd
						.replace(
							'{color}',
							colorNames[scannedPlayerColor] || scannedPlayerColor
						)
						.replace('{yourColor}', colorNames[playerColor])
				);
				setTimeout(() => setFeedback(null), 3000);
				setShowScanner(false);
				return;
			}

			// Don't connect to yourself
			if (scannedClientId === kmClient.id) {
				setFeedbackType('info');
				setFeedback(config.ownQrCodeMd);
				setTimeout(() => setFeedback(null), 2000);
				setShowScanner(false);
				return;
			}

			// Check if already connected
			if (
				factionActions.isConnected(playerColor, kmClient.id, scannedClientId)
			) {
				setFeedbackType('info');
				setFeedback(config.alreadyConnectedMd);
				setTimeout(() => setFeedback(null), 2000);
				setShowScanner(false);
				return;
			}

			// Connect the players
			await factionActions.connectPlayers(
				playerColor,
				kmClient.id,
				scannedClientId
			);
			setFeedbackType('success');
			setFeedback(config.connectedSuccessMd);

			// Clear feedback after 3 seconds
			setTimeout(() => setFeedback(null), 3000);
		} catch {
			setFeedbackType('error');
			setFeedback(config.failedToConnectMd);
			setTimeout(() => setFeedback(null), 2000);
		}

		setShowScanner(false);
	};

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-2 overflow-y-auto px-2 py-2 sm:gap-4 sm:px-4 sm:py-4">
			{/* Color reference + Group size in row */}
			<div className="flex items-center gap-3">
				<div
					className={`relative flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl shadow-lg sm:h-20 sm:w-32 ${getColorClass(playerColor)}`}
				>
					<div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
					<p className="relative line-clamp-3 px-2 text-center text-xs font-bold break-words text-white drop-shadow-sm sm:text-sm">
						{colorNames[playerColor]}
					</p>
				</div>
				<div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50 to-blue-100/50 px-4 py-2 text-center shadow-sm sm:px-6 sm:py-3">
					<p className="text-2xl font-bold text-blue-600 sm:text-3xl">
						{playerCount}
					</p>
					<p className="text-[10px] font-medium text-blue-600/80 sm:text-xs">
						{playerCount <= 1
							? config.justYouLabel
							: config.connectedWithCountMd.replace(
									'{count}',
									(playerCount - 1).toString()
								)}
					</p>
				</div>
			</div>

			{/* Instructions */}
			<div className="w-full max-w-xs text-center">
				<p className="text-xs text-slate-600 sm:text-sm">
					{config.colorSortingInstructionsMd}
				</p>
			</div>

			{/* QR Code section */}
			<div className="km-card w-full max-w-xs space-y-3 sm:max-w-sm">
				<p className="text-center text-sm font-semibold text-slate-700">
					{config.shareYourCodeLabel}
				</p>
				<div className="flex justify-center rounded-xl bg-slate-50 p-4">
					<KmQrCode data={qrCodeData} size={150} />
				</div>
				<p className="text-center text-xs text-slate-500">
					{config.orientationLabel}
				</p>
			</div>

			{/* Scan button */}
			<button
				type="button"
				className="km-btn-primary h-11 w-full max-w-xs text-sm font-semibold sm:max-w-sm"
				onClick={() => setShowScanner(true)}
			>
				<Scan className="size-5" />
				{config.scanQrCodeButton}
			</button>

			{/* Feedback message */}
			{feedback && (
				<div
					className={`km-success-pop flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl p-3 text-center text-sm font-medium sm:max-w-sm ${
						feedbackType === 'success'
							? 'bg-green-50 text-green-700 ring-1 ring-green-200'
							: feedbackType === 'error'
								? 'bg-red-50 text-red-700 ring-1 ring-red-200'
								: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
					}`}
				>
					{feedbackType === 'success' && (
						<CheckCircle className="size-5 shrink-0" />
					)}
					{feedbackType === 'error' && <XCircle className="size-5 shrink-0" />}
					{feedbackType === 'info' && <Info className="size-5 shrink-0" />}
					<div className="prose prose-sm">
						<Markdown>{feedback}</Markdown>
					</div>
				</div>
			)}

			{/* QR Scanner modal */}
			{showScanner && (
				<QrScanner
					onScan={handleQrScan}
					onClose={() => setShowScanner(false)}
				/>
			)}
		</div>
	);
};

// Wrapper component that handles playerColor being undefined
export const ColorSortingView: React.FC = () => {
	const { playerColors, roundActive } = useSnapshot(globalStore.proxy);
	const playerColor = playerColors[kmClient.id];

	if (!playerColor || !roundActive) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3">
				<div className="km-spinner size-8 border-slate-400" />
				<p className="text-lg font-medium text-slate-600">{config.loading}</p>
			</div>
		);
	}

	return <ColorSortingViewInner key={playerColor} playerColor={playerColor} />;
};
