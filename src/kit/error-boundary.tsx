// IMPORTANT: Do NOT modify or remove this file
import * as React from 'react';

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback: React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo): void {
		console.error('App Error:', {
			error,
			// The stack trace of the error
			componentStack: info.componentStack,
			// Warning: `captureOwnerStack` is not available in production.
			captureOwnerStack: React.captureOwnerStack()
		});
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}

		return this.props.children;
	}
}
