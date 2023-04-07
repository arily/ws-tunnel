module.exports = {
  env: {
    commonjs: true,
    node: true
  },
  extends: 'standard-with-typescript',
  plugins: [
    'html'
  ],
  parserOptions: {
    ecmaVersion: 12,
    project: './tsconfig.json'
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off'
  }
}
