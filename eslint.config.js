import antfu from '@antfu/eslint-config'

export default antfu({
	stylistic: {
		indent: 'tab',
	},
	rules: {
		'curly': 'off',
		'style/eol-last': 'off',
		'style/brace-style': 'off',
		'antfu/top-level-function': 'off',
		'antfu/if-newline': 'off',

	},
	ignores: ['dev-dist', 'assets/*', 'node-modules', 'dist'],
})