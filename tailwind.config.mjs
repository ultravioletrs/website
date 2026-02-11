/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Sen', 'sans-serif'],
				mono: ['Roboto Mono', 'monospace'],
				heading: ['Outfit', 'sans-serif'],
				body: ['Roboto Mono', 'monospace'],
			},
			colors: {
				primary: {
					DEFAULT: '#4F46E5', // Example placeholder, will refine
					dark: '#4338ca',
				},
				secondary: {
					DEFAULT: '#10b981', // Example placeholder
				},
				// Add more brand colors here
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}
