import { config } from '@/config';
import { useKmModal } from '@kokimoki/shared';
import { HelpCircle } from 'lucide-react';
import * as React from 'react';
import Markdown from 'react-markdown';

/**
 * Menu component to navigate between different views in the player layout
 *
 * This example is **optional** and can be removed if not needed
 */
export const PlayerMenu: React.FC = () => {
	const { openDrawer } = useKmModal();

	const handleOpenHelp = () => {
		openDrawer({
			content: (
				<div className="max-h-full w-full overflow-y-auto">
					<div className="container mx-auto px-4 py-16">
						<article className="prose">
							<Markdown>{config.menuHelpMd}</Markdown>
						</article>
					</div>
				</div>
			)
		});
	};

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={handleOpenHelp}
				className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-slate-900 hover:text-slate-50"
			>
				<HelpCircle className="size-5" />
				<span className="sr-only">{config.menuHelpAriaLabel}</span>
			</button>
		</div>
	);
};
