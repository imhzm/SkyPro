import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.{cjs,js}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]

export default config
