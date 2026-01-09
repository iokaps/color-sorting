import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * A custom ESLint configuration
 *
 * @type {import("eslint").Linter.Config} */
export default defineConfig([
	eslint.configs.recommended,
	tseslint.configs.recommended,
	reactPlugin.configs.flat.recommended,
	reactHooks.configs.flat.recommended,
	eslintConfigPrettier,
	{
		settings: { react: { version: 'detect' } },
		languageOptions: {
			globals: {
				...globals.serviceworker,
				...globals.browser
			}
		}
	},
	{
		rules: {
			// React scope no longer necessary with new JSX transform.
			'react/react-in-jsx-scope': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			],
			'no-console': ['warn', { allow: ['warn', 'error'] }]
		}
	},

	{
		ignores: ['dist/**']
	}
]);
