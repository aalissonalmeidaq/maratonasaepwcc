const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mesmas regras do servidor: nome da unidade de 2 a 120 caracteres. */
export function validarNomeDaUnidade(nome: string): string | undefined {
  const tamanho = nome.trim().length;
  return tamanho < 2 || tamanho > 120
    ? 'O nome da unidade deve ter de 2 a 120 caracteres.'
    : undefined;
}

/** Desativações exigem justificativa de ao menos 10 caracteres (`app.exigir_justificativa`). */
export function validarJustificativa(justificativa: string): string | undefined {
  return justificativa.trim().length < 10 ? 'Justifique com pelo menos 10 caracteres.' : undefined;
}

export interface ContaParaValidar {
  nome: string;
  email: string;
}

export function validarContaDaRede(
  c: ContaParaValidar,
): Partial<Record<keyof ContaParaValidar, string>> {
  const erros: Partial<Record<keyof ContaParaValidar, string>> = {};
  const nome = c.nome.trim().length;
  if (nome < 2 || nome > 160) erros.nome = 'Informe o nome (2 a 160 caracteres).';
  if (!EMAIL.test(c.email.trim())) erros.email = 'Informe um e-mail válido.';
  return erros;
}

export interface CadastroDeUnidade {
  nome: string;
  gestaoNome: string;
  gestaoEmail: string;
}

/** A conta de gestão é opcional (a unidade pode nascer sem gestão), mas, se começar, tem de estar completa. */
export function validarCadastroDeUnidade(
  c: CadastroDeUnidade,
): Partial<Record<keyof CadastroDeUnidade, string>> {
  const erros: Partial<Record<keyof CadastroDeUnidade, string>> = {};
  const nome = validarNomeDaUnidade(c.nome);
  if (nome) erros.nome = nome;
  if (c.gestaoNome.trim() || c.gestaoEmail.trim()) {
    const conta = validarContaDaRede({ nome: c.gestaoNome, email: c.gestaoEmail });
    if (conta.nome) erros.gestaoNome = conta.nome;
    if (conta.email) erros.gestaoEmail = conta.email;
  }
  return erros;
}

export interface CadastroDePessoa extends ContaParaValidar {
  funcoes: readonly string[];
}

/** Pessoa da equipe da unidade: conta válida e ao menos uma função (a gestão só o master concede). */
export function validarCadastroDePessoa(
  c: CadastroDePessoa,
): Partial<Record<keyof CadastroDePessoa, string>> {
  const erros: Partial<Record<keyof CadastroDePessoa, string>> = { ...validarContaDaRede(c) };
  if (c.funcoes.length === 0) erros.funcoes = 'Escolha ao menos uma função.';
  return erros;
}

export interface DadosDeEdicaoDaUnidade {
  nome: string;
  inicio: string;
  fim: string;
  coordenacaoId: string;
}

/** Mesmas regras do servidor (`validar_dados_da_edicao`) e a coordenação indicada pela gestão. */
export function validarEdicaoDaUnidade(
  e: DadosDeEdicaoDaUnidade,
): Partial<Record<keyof DadosDeEdicaoDaUnidade, string>> {
  const erros: Partial<Record<keyof DadosDeEdicaoDaUnidade, string>> = {};
  const nome = e.nome.trim().length;
  if (nome < 3 || nome > 160) erros.nome = 'Informe um nome de 3 a 160 caracteres.';
  if (e.inicio && e.fim && e.fim < e.inicio) erros.fim = 'O fim não pode ser antes do início.';
  if (!e.coordenacaoId) erros.coordenacaoId = 'Escolha quem coordena a edição.';
  return erros;
}
