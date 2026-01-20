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
			'grid min-h-dvh grid-rows-[auto_1fr_auto] bg-gradient-to-b from-slate-50 to-slate-100',
			className
		)}
	>
		{children}
	</div>
);

const PlayerHeader: React.FC<LayoutProps> = ({ children, className }) => (
	<header
		className={cn(
			'sticky top-0 z-10 border-b border-slate-200/50 bg-white/80 shadow-sm backdrop-blur-md',
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
			'sticky bottom-0 z-10 border-t border-slate-200/50 bg-white/80 backdrop-blur-md',
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
