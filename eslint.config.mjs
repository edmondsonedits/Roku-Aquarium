import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
 {ignores:['runtime/**','dist-local/**','node_modules/**']},
 ...tseslint.configs.recommended,
 {files:['**/*.{ts,tsx}'],plugins:{'react-hooks':hooks},rules:{...hooks.configs.recommended.rules}},
 {files:['**/*.test.{ts,mjs}'],rules:{'@typescript-eslint/no-explicit-any':'off'}}
);
