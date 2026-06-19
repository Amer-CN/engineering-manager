/** @type {import('tailwindcss').Config} */

/**
 * 辅助：创建引用 CSS 变量并支持 alpha 通道的色阶
 * CSS 变量格式为 "R G B"（空格分隔，无逗号），例如：
 *   --color-primary-500: 59 130 246;
 * 用法：
 *   bg-primary-500         → rgb(var(--color-primary-500) / 1)
 *   bg-primary-500/20      → rgb(var(--color-primary-500) / 0.2)
 *
 * <alpha-value> 是 Tailwind 识别的占位符，构建时自动替换。
 */
function colorVar(vName) {
  return `rgb(var(${vName}) / <alpha-value>)`
}

module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: colorVar('--color-primary-50'),
          100: colorVar('--color-primary-100'),
          200: colorVar('--color-primary-200'),
          300: colorVar('--color-primary-300'),
          400: colorVar('--color-primary-400'),
          500: colorVar('--color-primary-500'),
          600: colorVar('--color-primary-600'),
          700: colorVar('--color-primary-700'),
          800: colorVar('--color-primary-800'),
          900: colorVar('--color-primary-900'),
        },
        success: {
          50: colorVar('--color-success-50'),
          100: colorVar('--color-success-100'),
          200: colorVar('--color-success-200'),
          300: colorVar('--color-success-300'),
          400: colorVar('--color-success-400'),
          500: colorVar('--color-success-500'),
          600: colorVar('--color-success-600'),
          700: colorVar('--color-success-700'),
          800: colorVar('--color-success-800'),
          900: colorVar('--color-success-900'),
        },
        warning: {
          50: colorVar('--color-warning-50'),
          100: colorVar('--color-warning-100'),
          200: colorVar('--color-warning-200'),
          300: colorVar('--color-warning-300'),
          400: colorVar('--color-warning-400'),
          500: colorVar('--color-warning-500'),
          600: colorVar('--color-warning-600'),
          700: colorVar('--color-warning-700'),
          800: colorVar('--color-warning-800'),
          900: colorVar('--color-warning-900'),
        },
        danger: {
          50: colorVar('--color-danger-50'),
          100: colorVar('--color-danger-100'),
          200: colorVar('--color-danger-200'),
          300: colorVar('--color-danger-300'),
          400: colorVar('--color-danger-400'),
          500: colorVar('--color-danger-500'),
          600: colorVar('--color-danger-600'),
          700: colorVar('--color-danger-700'),
          800: colorVar('--color-danger-800'),
          900: colorVar('--color-danger-900'),
        },
        info: {
          50: colorVar('--color-info-50'),
          100: colorVar('--color-info-100'),
          200: colorVar('--color-info-200'),
          300: colorVar('--color-info-300'),
          400: colorVar('--color-info-400'),
          500: colorVar('--color-info-500'),
          600: colorVar('--color-info-600'),
          700: colorVar('--color-info-700'),
          800: colorVar('--color-info-800'),
          900: colorVar('--color-info-900'),
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'lifted': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'stagger-1': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
        'stagger-2': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'stagger-3': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.625rem', { lineHeight: '0.875rem' }],  // 10px — 替代 text-[10px]
        micro: ['0.6875rem', { lineHeight: '1rem' }],        // 11px — 替代 text-[11px]
      },
    },
  },
  plugins: [],
}
