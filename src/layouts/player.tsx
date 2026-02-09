import { Logo } from '@/components/logo';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface LayoutProps {
	children?: React.ReactNode;
	className?: string;
}

const PlayerRoot: React.FC<LayoutProps> = ({ children, className }) => (
	<div
		className={cn(
			'km-animated-bg grid min-h-dvh grid-rows-[auto_1fr_auto]',
			className
		)}
	>
		{children}
	</div>
);

const PlayerHeader: React.FC<LayoutProps> = ({ children, className }) => (
	<header
		className={cn(
			'sticky top-0 z-10 border-b border-white/60 bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl',
			className
		)}
	>
		<div className="container mx-auto flex items-center justify-between p-4">
			<Logo />
			{children}
		</div>
	</header>
);

const PlayerMain: React.FC<LayoutProps> = ({ children, className }) => (
	<main
		className={cn(
			'flex w-full flex-col items-center justify-center overflow-y-auto px-3 py-8 sm:px-4 sm:py-16',
			className
		)}
	>
		{children}
	</main>
);

const PlayerFooter: React.FC<LayoutProps> = ({ children, className }) => (
	<footer
		className={cn(
			'sticky bottom-0 z-10 border-t border-white/60 bg-white/70 shadow-[0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl',
			className
		)}
	>
		<div className="container mx-auto flex justify-center p-4">{children}</div>
	</footer>
);

/**
 * Layout components for the `player` mode
 */
export const PlayerLayout = {
	Root: PlayerRoot,
	Header: PlayerHeader,
	Main: PlayerMain,
	Footer: PlayerFooter
};
