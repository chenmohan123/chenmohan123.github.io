import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // .tmp 下存着多份历史源码快照，其 *.test.tsx 会被默认 include 收集，
    // 在同一个 jsdom 里重复注册角色导致 "Found multiple elements" 一类的假红。
    exclude: ['**/node_modules/**', '**/tests/**/*.spec.ts', '**/.worktrees/**', '**/.pnpm-store/**', '**/.tmp/**'],
  },
});
