import { defineConfig } from 'oxlint'

export default defineConfig({
	categories: {
		correctness: 'warn',
	},
	rules: {
		'eslint/no-unused-vars': 'error',
		'typescript/no-floating-promises': 'allow',
		'no-unused-expressions': ['warn', { allowTaggedTemplates: true }],
	},
	options: {
		typeAware: true,
		typeCheck: true,
	},
	ignorePatterns: [],
})
