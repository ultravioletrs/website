/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['Sen', 'sans-serif'],
				mono: ['Roboto Mono', 'monospace'],
				heading: ['Outfit', 'sans-serif'],
				body: ['Roboto Mono', 'monospace'],
			},
			colors: {
				background: 'rgb(var(--color-background) / <alpha-value>)',
				surface: 'rgb(var(--color-surface) / <alpha-value>)',
				'surface-hover': 'rgb(var(--color-surface-hover) / <alpha-value>)',
				
				primary: {
					DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
					dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
				},
				secondary: {
					DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
				},
				
				text: {
					main: 'rgb(var(--color-text-main) / <alpha-value>)',
					muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
					inverted: 'rgb(var(--color-text-inverted) / <alpha-value>)',
				},
				
				border: 'rgb(var(--color-border) / <alpha-value>)',
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}
