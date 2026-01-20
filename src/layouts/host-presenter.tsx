import { Logo } from '@/components/logo';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface LayoutProps {
	children?: React.ReactNode;
	className?: string;
}

const HostPresenterRoot: React.FC<LayoutProps> = ({ children, className }) => (
	<div
		className={cn(
			'grid min-h-dvh grid-rows-[auto_1fr_auto] bg-gradient-to-b from-slate-50 to-slate-100',
			className
		)}
	>
		{children}
	</div>
);

const HostPresenterHeader: React.FC<LayoutProps> = ({
	children,
	className
}) => (
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

const HostPresenterMain: React.FC<LayoutProps> = ({ children, className }) => (
	<main
		className={cn(
			'container mx-auto flex items-center justify-center px-4 py-16',
			className
		)}
	>
		{children}
	</main>
);

const HostPresenterFooter: React.FC<LayoutProps> = ({
	children,
	className
}) => (
	<footer
		className={cn(
			'sticky bottom-0 z-10 border-t border-slate-200/50 bg-white/80 backdrop-blur-md',
			className
		)}
	>
		<div className="container mx-auto flex items-center justify-between p-4">
			{children}
		</div>
	</footer>
);

/**
 * Layout components for the `host` and `presenter` modes
 */
export const HostPresenterLayout = {
	Root: HostPresenterRoot,
	Header: HostPresenterHeader,
	Main: HostPresenterMain,
	Footer: HostPresenterFooter
};
