import { defineConfig } from 'oxfmt'

export default defineConfig({
	semi: false,
	printWidth: 200,
	singleQuote: true,
	tabWidth: 4,
	objectWrap: 'preserve',
	useTabs: true,
	embeddedLanguageFormatting: 'auto',
	ignorePatterns: ['dev-dist', 'assets', 'node-modules', 'dist', 'public', 'src-tauri', 'editor/src-tauri', 'src/static-assets.ts'],
	singleAttributePerLine: true,
})
