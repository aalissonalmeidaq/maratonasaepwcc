import { expect, it } from 'vitest';
it('falha injetada (prova da CI, não mesclar)', () => {
  expect(1).toBe(2);
});
