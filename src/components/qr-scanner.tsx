import { X } from 'lucide-react';
import * as React from 'react';

interface QrScannerProps {
	onScan: (data: string) => void;
	onClose: () => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
	const videoRef = React.useRef<HTMLVideoElement>(null);
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [isScanning, setIsScanning] = React.useState(true);
	const animationFrameRef = React.useRef<number | undefined>(undefined);
	const isScanningRef = React.useRef(true);
	const callbackRef = React.useRef(onScan);

	// Update callback ref when onScan changes
	React.useEffect(() => {
		callbackRef.current = onScan;
	}, [onScan]);

	// Create scanning function that will be stored in a ref
	const createScanFunction = React.useCallback(() => {
		const scanFunction = () => {
			const video = videoRef.current;
			const canvas = canvasRef.current;

			if (!video || !canvas || !isScanningRef.current) return;

			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			try {
				// Try to decode using the Zxing library if available
				const ZXing = (window as unknown as Record<string, unknown>)
					.ZXing as Record<string, unknown>;
				if (ZXing) {
					const BrowserMultiFormatReader =
						ZXing.BrowserMultiFormatReader as new () => {
							decodeFromCanvas: (
								canvas: HTMLCanvasElement
							) => { text: string } | null;
						};
					const codeReader = new BrowserMultiFormatReader();
					try {
						const result = codeReader.decodeFromCanvas(canvas);
						if (result?.text) {
							isScanningRef.current = false;
							setIsScanning(false);
							callbackRef.current(result.text);
							return;
						}
					} catch {
						// QR code not found in this frame, continue scanning
					}
				}
			} catch {
				// Continue scanning on error
			}

			// Continue scanning
			if (isScanningRef.current) {
				animationFrameRef.current = requestAnimationFrame(scanFunction);
			}
		};

		return scanFunction;
	}, []);

	// Request camera permission and start scanning
	React.useEffect(() => {
		const scanFunction = createScanFunction();

		const startCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' }
				});

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					// Wait for video to load metadata
					videoRef.current.onloadedmetadata = () => {
						videoRef.current?.play();
						scanFunction();
					};
				}
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to access camera';
				setError(`Camera permission denied: ${message}`);
				setIsScanning(false);
			}
		};

		startCamera();

		return () => {
			// Clean up camera stream - store ref to avoid stale closure issues
			// We intentionally store videoRef.current in a local var to capture it at cleanup time
			// eslint-disable-next-line react-hooks/exhaustive-deps
			const video = videoRef.current;
			if (video?.srcObject) {
				const stream = video.srcObject as MediaStream;
				stream.getTracks().forEach((track) => track.stop());
			}

			// Cancel animation frame
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [createScanFunction]);

	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
			<div className="w-full max-w-md space-y-4">
				{error ? (
					<div className="space-y-4 rounded-xl bg-white p-6 text-center">
						<p className="text-red-500">{error}</p>
						<button
							type="button"
							className="km-btn-primary w-full"
							onClick={onClose}
						>
							Close
						</button>
					</div>
				) : (
					<>
						<div className="relative overflow-hidden rounded-xl bg-black">
							<video ref={videoRef} className="w-full" autoPlay playsInline />
							<canvas ref={canvasRef} className="hidden" />
							{isScanning && (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="h-64 w-64 border-4 border-green-500 opacity-50" />
								</div>
							)}
						</div>

						<button
							type="button"
							className="absolute top-4 right-4 rounded-full bg-white p-2"
							onClick={onClose}
						>
							<X className="size-6 text-black" />
						</button>

						<p className="text-center text-white">
							{isScanning
								? 'Point your camera at a QR code'
								: 'QR code detected, processing...'}
						</p>
					</>
				)}
			</div>
		</div>
	);
};
