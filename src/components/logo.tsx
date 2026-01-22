import { config } from '@/config';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';

const DEFAULT_LOGO = 'https://static.kokimoki.com/gfc/v2/logo.svg';

/**
 * Logo component that displays custom logo from globalStore or falls back to default
 */
export const Logo: React.FC<{ className?: string }> = ({ className }) => {
	const { logoUrl } = useSnapshot(globalStore.proxy);
	const src = logoUrl && logoUrl.length > 0 ? logoUrl : DEFAULT_LOGO;

	return (
		<img
			src={src}
			alt={config.title}
			title={config.title}
			className={cn('h-9', className)}
		/>
	);
};
