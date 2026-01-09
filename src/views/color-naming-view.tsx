import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { CirclePlay } from 'lucide-react';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';

const COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow'];

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600'
};

export const ColorNamingView: React.FC = () => {
	const { colorNames, roundDurationSeconds, logoUrl } = useSnapshot(
		globalStore.proxy
	);
	const [editedNames, setEditedNames] =
		React.useState<Record<ColorName, string>>(colorNames);
	const [editedDuration, setEditedDuration] =
		React.useState(roundDurationSeconds);
	const [logoFile, setLogoFile] = React.useState<File | null>(null);
	const [logoPreview, setLogoPreview] = React.useState<string | null>(logoUrl);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const logoInputRef = React.useRef<HTMLInputElement>(null);

	// Update local state when global state changes
	React.useEffect(() => {
		setEditedNames(colorNames);
		setEditedDuration(roundDurationSeconds);
		setLogoPreview(logoUrl);
	}, [colorNames, roundDurationSeconds, logoUrl]);

	const handleNameChange = (color: ColorName, name: string) => {
		setEditedNames((prev) => ({
			...prev,
			[color]: name
		}));
	};

	const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10);
		if (!isNaN(value) && value > 0) {
			setEditedDuration(value);
		}
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
			// Update all color names
			for (const color of COLORS) {
				if (editedNames[color] !== colorNames[color]) {
					await globalActions.updateColorName(color, editedNames[color]);
				}
			}

			// Update round duration if changed
			if (editedDuration !== roundDurationSeconds) {
				await globalActions.updateRoundDuration(editedDuration);
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

			// Start the game after saving names and settings
			await globalActions.startGame();
		} catch (err) {
			console.error('Failed to save game settings:', err);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-8">
			<div className="prose max-w-none">
				<ReactMarkdown>{config.colorNamingMd}</ReactMarkdown>
			</div>

			{/* Color Names Section */}
			<div>
				<h3 className="mb-4 text-lg font-semibold">Color Names</h3>
				<div className="grid gap-6 sm:grid-cols-2">
					{COLORS.map((color) => (
						<div
							key={color}
							className="space-y-3 rounded-xl border border-slate-300 bg-white p-6"
						>
							{/* Color preview */}
							<div className={`h-16 rounded-lg ${COLOR_CLASSES[color]}`} />

							{/* Color input */}
							<label
								htmlFor={`color-${color}`}
								className="block text-sm font-medium"
							>
								{config.colorNameLabel}
							</label>
							<input
								id={`color-${color}`}
								type="text"
								value={editedNames[color]}
								onChange={(e) => handleNameChange(color, e.target.value)}
								placeholder={colorNames[color]}
								className="km-input"
								disabled={isSubmitting}
							/>
						</div>
					))}
				</div>
			</div>

			{/* Round Duration Section */}
			<div className="rounded-xl border border-slate-300 bg-white p-6">
				<label htmlFor="round-duration" className="block text-sm font-medium">
					{config.roundDurationLabel}
				</label>
				<input
					id="round-duration"
					type="number"
					min="10"
					max="600"
					value={editedDuration}
					onChange={handleDurationChange}
					className="km-input mt-2"
					disabled={isSubmitting}
				/>
			</div>

			{/* Logo Upload Section */}
			<div className="rounded-xl border border-slate-300 bg-white p-6">
				<label htmlFor="logo-upload" className="block text-sm font-medium">
					{config.logoUploadLabel}
				</label>
				<input
					ref={logoInputRef}
					id="logo-upload"
					type="file"
					accept="image/*"
					onChange={handleLogoSelect}
					className="mt-2 block w-full text-sm"
					disabled={isSubmitting}
				/>

				{/* Logo Preview */}
				{logoPreview && (
					<div className="mt-4">
						<p className="mb-2 text-sm font-medium">Preview:</p>
						<img
							src={logoPreview}
							alt="Logo preview"
							className="h-20 rounded-lg object-contain"
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
