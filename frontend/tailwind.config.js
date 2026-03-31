/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,jsx}'],
	theme: {
		extend: {
			colors: {
				/* Core palette */
				ink: '#0F172A',
				'ink-light': '#1E293B',
				'ink-lighter': '#334155',
				/* Primary - Subtle blue-slate */
				primary: '#3B82F6',
				'primary-dark': '#1E40AF',
				'primary-light': '#DBEAFE',
				/* Neutral palette */
				'neutral-50': '#F9FAFB',
				'neutral-100': '#F3F4F6',
				'neutral-200': '#E5E7EB',
				'neutral-300': '#D1D5DB',
				'neutral-600': '#4B5563',
				/* Accent for user messages */
				accent: '#10B981',
				/* Legacy - keeping for backward compatibility */
				dusk: '#0f172a',
				blaze: '#d97706',
				mint: '#059669',
				parchment: '#fefce8',
			},
			fontFamily: {
				display: ['"Space Grotesk"', 'sans-serif'],
				body: ['"Manrope"', 'sans-serif'],
			},
			spacing: {
				0: '0',
				0.5: '4px',
				1: '8px',
				1.5: '12px',
				2: '16px',
				2.5: '20px',
				3: '24px',
				3.5: '28px',
				4: '32px',
				5: '40px',
				6: '48px',
				8: '64px',
			},
			borderRadius: {
				xs: '6px',
				sm: '8px',
				md: '12px',
				lg: '16px',
				full: '9999px',
			},
			boxShadow: {
				xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
				sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'chat-bubble': '0 2px 8px rgba(0, 0, 0, 0.08)',
			},
		},
	},
	plugins: [],
};
