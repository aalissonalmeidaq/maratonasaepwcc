import { beforeEach, describe, expect, it, vi } from 'vitest';
import { regulamentoPublicoFixture as fixture } from '@/test/fixtures/regulamentoPublico';
import { chaveDaCopia, lerCopia, salvarCopia } from './copiaLocal';
describe('cópia pública isolada (FR-006/006a/007)', () => {
  beforeEach(() => localStorage.clear());
  it('guarda uma cópia datada, validada e sem campos extras aninhados', () => {
    const conteudo = structuredClone(fixture);
    Object.assign(conteudo.edicoes[0]!.regras.presenca, { privado: 'SEGREDO' });
    const salvo = salvarCopia('teste', conteudo);
    expect(salvo).toMatch(/^\d{4}-/);
    expect(lerCopia('teste')?.salvoEm).toBe(salvo);
    expect(localStorage.getItem('teste')).not.toContain('SEGREDO');
  });
  it('substitui integralmente também quando a lista vier vazia', () => {
    salvarCopia('teste', fixture);
    salvarCopia('teste', { ...fixture, edicoes: [] });
    expect(lerCopia('teste')?.conteudo.edicoes).toEqual([]);
  });
  it('não mistura demo e projetos', () => {
    const demo = chaveDaCopia('demo', 'local');
    salvarCopia(demo, fixture);
    expect(lerCopia(chaveDaCopia('supabase', 'local'))).toBeNull();
    expect(chaveDaCopia('supabase', 'a')).not.toBe(chaveDaCopia('supabase', 'b'));
  });
  it('trata cópia corrompida e ausente sem quebrar a leitura', () => {
    localStorage.setItem('teste', '{');
    expect(lerCopia('teste')).toBeNull();
    expect(lerCopia('ausente')).toBeNull();
  });
  it.each(['QuotaExceededError', 'SecurityError'])(
    'falha %s não anuncia gravação nem altera cópia anterior',
    (nome) => {
      salvarCopia('teste', fixture);
      const anterior = localStorage.getItem('teste');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('bloqueado', nome);
      });
      expect(salvarCopia('teste', { ...fixture, edicoes: [] })).toBeNull();
      expect(localStorage.getItem('teste')).toBe(anterior);
    },
  );
});
