import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import {
	globalStore,
	type ColorName,
	type PresenterVisualizationMode
} from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { generateColorArray } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import {
	BarChart3,
	Circle,
	CirclePlay,
	Network,
	PieChart,
	Sparkles
} from 'lucide-react';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';

const COLOR_CLASSES: Record<string, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600',
	purple: 'bg-purple-600',
	pink: 'bg-pink-600',
	indigo: 'bg-indigo-600',
	cyan: 'bg-cyan-600',
	orange: 'bg-orange-600',
	lime: 'bg-lime-600'
};

export const ColorNamingView: React.FC = () => {
	const {
		colorNames,
		roundDurationSeconds,
		logoUrl,
		totalRounds,
		numberOfColors,
		presenterVisualizationMode
	} = useSnapshot(globalStore.proxy);
	const [editedNames, setEditedNames] =
		React.useState<Record<ColorName, string>>(colorNames);
	const [editedDuration, setEditedDuration] =
		React.useState(roundDurationSeconds);
	const [editedTotalRounds, setEditedTotalRounds] = React.useState(totalRounds);
	const [editedNumberOfColors, setEditedNumberOfColors] =
		React.useState(numberOfColors);
	const [editedVisualizationMode, setEditedVisualizationMode] =
		React.useState<PresenterVisualizationMode>(presenterVisualizationMode);
	const [logoFile, setLogoFile] = React.useState<File | null>(null);
	const [logoPreview, setLogoPreview] = React.useState<string | null>(logoUrl);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const logoInputRef = React.useRef<HTMLInputElement>(null);

	// Update local state when global state changes
	React.useEffect(() => {
		setEditedNames(colorNames);
		setEditedDuration(roundDurationSeconds);
		setEditedTotalRounds(totalRounds);
		setEditedNumberOfColors(numberOfColors);
		setLogoPreview(logoUrl);
		setEditedVisualizationMode(presenterVisualizationMode);
	}, [
		colorNames,
		roundDurationSeconds,
		totalRounds,
		numberOfColors,
		logoUrl,
		presenterVisualizationMode
	]);

	const handleNameChange = (color: ColorName, name: string) => {
		// Limit color name to 20 characters
		const trimmedName = name.slice(0, 20);
		setEditedNames((prev) => ({
			...prev,
			[color]: trimmedName
		}));
	};

	const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10);
		if (!isNaN(value) && value > 0) {
			// Clamp to valid range (10-180 seconds)
			setEditedDuration(Math.min(180, Math.max(10, value)));
		}
	};

	const handleColorCountChange = (newCount: number) => {
		const validCount = Math.max(1, Math.min(10, newCount));
		setEditedNumberOfColors(validCount);
		// Update color names to match new count
		const newColors = generateColorArray(validCount);
		const newNames: Record<ColorName, string> = {};
		newColors.forEach((color) => {
			newNames[color] = editedNames[color] || colorNames[color] || color;
		});
		setEditedNames(newNames);
	};

	const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && file.type.startsWith('image/')) {
			setLogoFile(file);
			// Create preview
			const reader = new FileReader();
			reader.onload = (event) => {
				setLogoPreview(event.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSave = async () => {
		setIsSubmitting(true);
		try {
			// Update number of colors if changed
			if (editedNumberOfColors !== numberOfColors) {
				await globalActions.updateNumberOfColors(editedNumberOfColors);
			}

			// Get the colors for the current selection
			const colorsToUpdate = generateColorArray(editedNumberOfColors);

			// Update color names that have changed
			for (const color of colorsToUpdate) {
				if (editedNames[color] !== colorNames[color]) {
					await globalActions.updateColorName(color, editedNames[color]);
				}
			}

			// Update round duration if changed
			if (editedDuration !== roundDurationSeconds) {
				await globalActions.updateRoundDuration(editedDuration);
			}

			// Update total rounds if changed
			if (editedTotalRounds !== totalRounds) {
				await globalActions.updateTotalRounds(editedTotalRounds);
			}

			// Upload logo if a new file was selected
			if (logoFile) {
				try {
					const uploadedFile = await kmClient.storage.upload(
						logoFile.name,
						logoFile,
						['logo']
					);
					await globalActions.updateLogoUrl(uploadedFile.url);
				} catch (err) {
					console.error('Failed to upload logo:', err);
					// Continue even if logo upload fails
				}
			}

			// Update visualization mode if changed
			if (editedVisualizationMode !== presenterVisualizationMode) {
				await globalActions.setPresenterVisualizationMode(
					editedVisualizationMode
				);
			}

			// Start the game after saving names and settings
			await globalActions.startGame();
		} catch (err) {
			console.error('Failed to save game settings:', err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const currentColors = generateColorArray(editedNumberOfColors);

	return (
		<div className="space-y-8">
			<div className="prose max-w-none">
				<ReactMarkdown>{config.colorNamingMd}</ReactMarkdown>
			</div>

			{/* Number of Colors Section */}
			<div className="km-card">
				<label
					htmlFor="number-of-colors"
					className="block text-sm font-medium text-slate-700"
				>
					{config.numberOfColorsLabel}
				</label>
				<div className="mt-3 flex items-center gap-3">
					<button
						type="button"
						className="km-btn-secondary size-12 text-xl font-bold"
						onClick={() => handleColorCountChange(editedNumberOfColors - 1)}
						disabled={isSubmitting || editedNumberOfColors <= 1}
					>
						−
					</button>
					<span className="w-16 text-center text-2xl font-bold text-slate-900">
						{editedNumberOfColors}
					</span>
					<button
						type="button"
						className="km-btn-secondary size-12 text-xl font-bold"
						onClick={() => handleColorCountChange(editedNumberOfColors + 1)}
						disabled={isSubmitting || editedNumberOfColors >= 10}
					>
						+
					</button>
				</div>
			</div>

			{/* Color Names Section */}
			<div>
				<h3 className="mb-4 text-lg font-semibold text-slate-900">
					{config.colorNamesTitle}
				</h3>
				<div className="grid gap-4 sm:grid-cols-2">
					{currentColors.map((color) => (
						<div
							key={color}
							className="shadow-card space-y-3 overflow-hidden rounded-2xl bg-white p-5"
						>
							{/* Color preview */}
							<div className={`h-14 rounded-xl ${COLOR_CLASSES[color]}`} />

							{/* Color input */}
							<label
								htmlFor={`color-${color}`}
								className="block text-sm font-medium text-slate-700"
							>
								{config.colorNameLabel}
							</label>
							<input
								id={`color-${color}`}
								type="text"
								value={editedNames[color] || ''}
								onChange={(e) => handleNameChange(color, e.target.value)}
								placeholder={colorNames[color]}
								className="km-input"
								disabled={isSubmitting}
								maxLength={20}
							/>
						</div>
					))}
				</div>
			</div>

			{/* Round Duration Section */}
			<div className="km-card">
				<label
					htmlFor="round-duration"
					className="block text-sm font-medium text-slate-700"
				>
					{config.roundDurationLabel}
				</label>
				<input
					id="round-duration"
					type="number"
					min="10"
					max="180"
					value={editedDuration}
					onChange={handleDurationChange}
					className="km-input mt-3"
					disabled={isSubmitting}
				/>
			</div>

			{/* Total Rounds Section */}
			<div className="km-card">
				<label
					htmlFor="total-rounds"
					className="block text-sm font-medium text-slate-700"
				>
					{config.totalRoundsLabel}
				</label>
				<div className="mt-3 flex items-center gap-3">
					<button
						type="button"
						className="km-btn-secondary size-12 text-xl font-bold"
						onClick={() =>
							setEditedTotalRounds((prev) => Math.max(1, prev - 1))
						}
						disabled={isSubmitting || editedTotalRounds <= 1}
					>
						−
					</button>
					<span className="w-16 text-center text-2xl font-bold text-slate-900">
						{editedTotalRounds}
					</span>
					<button
						type="button"
						className="km-btn-secondary size-12 text-xl font-bold"
						onClick={() => setEditedTotalRounds((prev) => prev + 1)}
						disabled={isSubmitting || editedTotalRounds >= 20}
					>
						+
					</button>
				</div>
			</div>

			{/* Presenter Visualization Mode Section */}
			<div className="km-card">
				<label className="block text-sm font-medium text-slate-700">
					{config.visualizationModeLabel}
				</label>
				<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
					{(
						[
							{
								mode: 'pulse',
								label: config.visualizationPulseLabel,
								icon: Sparkles
							},
							{
								mode: 'network',
								label: config.visualizationNetworkLabel,
								icon: Network
							},
							{
								mode: 'bars',
								label: config.visualizationBarsLabel,
								icon: BarChart3
							},
							{
								mode: 'bubbles',
								label: config.visualizationBubblesLabel,
								icon: Circle
							},
							{
								mode: 'pie',
								label: config.visualizationPieLabel,
								icon: PieChart
							}
						] as const
					).map(({ mode, label, icon: Icon }) => (
						<button
							key={mode}
							type="button"
							onClick={() => setEditedVisualizationMode(mode)}
							disabled={isSubmitting}
							className={cn(
								'flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-sm font-medium transition-all',
								editedVisualizationMode === mode
									? 'bg-blue-500 text-white shadow-lg'
									: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
							)}
						>
							<Icon className="size-5" />
							<span className="text-xs">{label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Logo Upload Section */}
			<div className="km-card">
				<label
					htmlFor="logo-upload"
					className="block text-sm font-medium text-slate-700"
				>
					{config.logoUploadLabel}
				</label>
				<input
					ref={logoInputRef}
					id="logo-upload"
					type="file"
					accept="image/*"
					onChange={handleLogoSelect}
					className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
					disabled={isSubmitting}
				/>

				{/* Logo Preview */}
				{logoPreview && (
					<div className="mt-4">
						<p className="mb-2 text-sm font-medium text-slate-700">
							{config.logoPreviewLabel}
						</p>
						<img
							src={logoPreview}
							alt="Logo preview"
							className="h-20 rounded-xl object-contain"
						/>
					</div>
				)}
			</div>

			{/* Submit button */}
			<button
				type="button"
				className="km-btn-primary w-full"
				onClick={handleSave}
				disabled={isSubmitting}
			>
				<CirclePlay className="size-5" />
				{config.saveColorNamesButton}
			</button>
		</div>
	);
};
