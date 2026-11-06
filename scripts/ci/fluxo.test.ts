// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// Spec 017 — guarda da estrutura do fluxo de CI (contracts/fluxo-ci.md). O fluxo só muda se este
// teste continuar descrevendo o que a spec exige.
const RAIZ = resolve(import.meta.dirname, '..', '..');
const TEXTO = readFileSync(resolve(RAIZ, '.github/workflows/ci.yml'), 'utf-8');

interface Passo {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
}
interface Job {
  name: string;
  'runs-on': string;
  'timeout-minutes': number;
  needs?: unknown;
  steps: Passo[];
}
interface Fluxo {
  name: string;
  on: Record<string, { branches?: string[]; types?: string[] } | null>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': string | boolean };
  jobs: Record<string, Job>;
}

const fluxo = parse(TEXTO) as Fluxo;
const jobs = Object.entries(fluxo.jobs);
const pacote = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf-8')) as {
  scripts: Record<string, string>;
};
const comandosDe = (job: Job) => job.steps.map((p) => p.run ?? '').join('\n');

const LIMITES: Record<string, number> = {
  qualidade: 15,
  banco: 15,
  'jornadas-demo': 20,
  'jornadas-supabase': 25,
};

describe('fluxo de CI (spec 017)', () => {
  it('dispara em propostas para o main, push no main e execução manual', () => {
    expect(fluxo.on.pull_request?.branches).toEqual(['main']);
    expect(fluxo.on.pull_request?.types).toEqual(
      expect.arrayContaining(['opened', 'synchronize', 'reopened', 'ready_for_review']),
    );
    expect(fluxo.on.push?.branches).toEqual(['main']);
    expect('workflow_dispatch' in fluxo.on).toBe(true);
    expect(Object.keys(fluxo.on)).not.toContain('pull_request_target');
    expect(Object.keys(fluxo.on)).not.toContain('schedule');
  });

  it('tem exatamente as quatro verificações, com nomes exatos e sem dependência entre elas', () => {
    expect(jobs.map(([, j]) => j.name).sort()).toEqual(Object.keys(LIMITES).sort());
    for (const [, job] of jobs) expect(job.needs).toBeUndefined();
  });

  it('todo job tem máquina fixa e limite de tempo', () => {
    for (const [, job] of jobs) {
      expect(job['runs-on']).toBe('ubuntu-24.04');
      expect(job['timeout-minutes']).toBe(LIMITES[job.name]);
    }
  });

  it('usa permissões mínimas e cancela a execução anterior só nas propostas', () => {
    expect(fluxo.permissions).toEqual({ contents: 'read' });
    expect(fluxo.concurrency.group).toContain('github.event.pull_request.number');
    expect(String(fluxo.concurrency['cancel-in-progress'])).toContain(
      "github.event_name == 'pull_request'",
    );
  });

  it('executa os mesmos comandos do projeto', () => {
    expect(pacote.scripts.verify).toBeDefined();
    const por = Object.fromEntries(jobs.map(([, j]) => [j.name, comandosDe(j)]));
    expect(por.qualidade).toContain('npm run verify');
    expect(por.banco).toContain('supabase test db');
    expect(por['jornadas-demo']).toContain('npm run test:e2e');
    expect(por['jornadas-demo']).not.toContain('test:e2e:supabase');
    expect(por['jornadas-supabase']).toContain('npm run test:e2e:supabase');
    for (const nome of ['verify', 'test:db', 'test:e2e', 'test:e2e:supabase']) {
      expect(pacote.scripts[nome]).toBeDefined();
    }
  });

  it('não usa segredos, banco remoto nem gatilhos com privilégio', () => {
    expect(TEXTO).not.toMatch(/secrets\./);
    expect(TEXTO).not.toMatch(/service_role/i);
    expect(TEXTO).not.toMatch(/pull_request_target/);
    expect(TEXTO).not.toMatch(/supabase\s+link/);
    expect(TEXTO).not.toMatch(/db\s+push/);
    expect(TEXTO).not.toMatch(/--db-url/);
  });

  it('só lê a chave pública da saída de supabase status e nunca imprime as demais', () => {
    expect(TEXTO).not.toMatch(/\beval\b/);
    expect(TEXTO).not.toMatch(/SERVICE_ROLE_KEY|SECRET_KEY|JWT_SECRET/);
    expect(TEXTO).not.toMatch(/supabase status[^\n]*>>\s*"?\$GITHUB_(ENV|OUTPUT)/);
    expect(TEXTO).toContain('PUBLISHABLE_KEY');
  });

  it('limita as ações de terceiros às oficiais do GitHub e à CLI do Supabase', () => {
    const usos = jobs.flatMap(([, j]) => j.steps.map((p) => p.uses).filter(Boolean)) as string[];
    expect(usos.length).toBeGreaterThan(0);
    for (const uso of usos) {
      expect(uso.startsWith('actions/') || uso.startsWith('supabase/setup-cli@')).toBe(true);
    }
  });

  it('usa a mesma versão da CLI do Supabase em todos os jobs que a instalam', () => {
    const versoes = jobs.flatMap(([, j]) =>
      j.steps.filter((p) => p.uses?.startsWith('supabase/setup-cli@')).map((p) => p.with?.version),
    );
    expect(versoes.length).toBeGreaterThanOrEqual(2);
    expect(new Set(versoes)).toEqual(new Set(['2.118.0']));
  });

  it('guarda artefatos só em falha, por 7 dias, e só nos jobs de jornadas', () => {
    for (const [, job] of jobs) {
      const envios = job.steps.filter((p) => p.uses?.startsWith('actions/upload-artifact@'));
      if (job.name.startsWith('jornadas-')) {
        expect(envios.length).toBeGreaterThanOrEqual(1);
        for (const envio of envios) {
          expect(envio.if).toBe('failure()');
          expect(envio.with?.['retention-days']).toBe(7);
          expect(String(envio.with?.name)).toBe(`${job.name}-falha`);
        }
      } else {
        expect(envios).toHaveLength(0);
      }
    }
  });
});
