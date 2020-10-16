module.exports = {
  root: true,
  env: { es6: true },
  ignorePatterns: ['node_modules', 'build', 'coverage'],
  globals: { BigInt: true, console: true, WebAssembly: true },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [
        'airbnb-typescript',
        'airbnb/hooks',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'prettier/react',
        'prettier/@typescript-eslint',
      ],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json',
      },
      rules: {
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
            'newlines-between': 'always',
            alphabetize: {
              order: 'asc',
            },
          },
        ],
        'no-underscore-dangle': [
          'error',
          {
            allowAfterThis: true,
            allowAfterSuper: true,
            allowAfterThisConstructor: true,
          },
        ],
        'no-restricted-imports': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
          typescript: {
            project: './tsconfig.json',
          },
          node: {
            extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
          },
        },
      },
    },
    {
      files: ['./src/lib/**/*.ts'],
      rules: {
        'import/prefer-default-export': 'off',
      },
    },
    {
      files: ['./tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'global-require': 'off',
      },
    },
  ],
}
