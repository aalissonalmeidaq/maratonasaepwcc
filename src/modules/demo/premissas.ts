import type {
  CatalogoDePremissas,
  Premissa,
  RepositorioPremissas,
  Resposta,
  Tema,
} from '@/modules/premissas';

type ItemDoCatalogo = Pick<
  Premissa,
  'codigo' | 'tema' | 'ordem' | 'pergunta' | 'premissaEmUso' | 'ondeAfeta' | 'opcoes' | 'referencia'
>;

const DOC = 'docs/decisoes-e-pendencias.md';

function item(
  codigo: string,
  tema: Tema,
  ordem: number,
  pergunta: string,
  premissaEmUso: string,
  ondeAfeta: string,
  referencia: string,
  opcoes: string[] = [],
): ItemDoCatalogo {
  return { codigo, tema, ordem, pergunta, premissaEmUso, ondeAfeta, opcoes, referencia };
}

/**
 * Catálogo da spec 015 (Apêndice A), com o mesmo texto da migration
 * `20261109120000_premissas_em_validacao.sql`. Texto tirado da documentação existente, sem regra
 * nova.
 */
export const CATALOGO_PREMISSAS: ItemDoCatalogo[] = [
  item(
    'P01',
    'Identidade visual',
    1,
    'Qual versão dos arquivos da marca é a aprovada?',
    'O sistema usa os SVGs de docs/referencias/; a versão anterior em VETORIZADAS CLAUDE/ (prefixo saep-) não é usada.',
    'Logotipo na tela de entrada, no menu, no regulamento público e nos ícones do aplicativo.',
    `${DOC} §1`,
    ['Usar os arquivos de docs/referencias/', 'Usar os arquivos de VETORIZADAS CLAUDE/'],
  ),
  item(
    'P02',
    'Identidade visual',
    2,
    'Os 118 ícones redesenhados a partir das pranchas estão fiéis à identidade visual?',
    'Ícones redesenhados à mão a partir das pranchas (não por rastreio automático), mais o ícone "Salvar" criado no mesmo estilo.',
    'Todos os ícones do menu, dos cartões e dos botões (galeria em docs/icones/galeria.html).',
    `${DOC} §1 e §2.1`,
  ),
  item(
    'P03',
    'Identidade visual',
    3,
    'As cores da interface devem seguir os tokens atuais ou a paleta da prancha?',
    'A interface usa os tokens (azul-marinho #062457, amarelo #FFB820, borda #DCE5EF); a prancha mostra #0B2D6B, #FFC02E e #E6EBF2.',
    'Todas as cores da interface; os padrões gráficos já usam a paleta da prancha.',
    `${DOC} §2 e §2.1`,
    ['Manter os tokens atuais', 'Migrar os tokens para a paleta da prancha'],
  ),
  item(
    'P04',
    'Identidade visual',
    4,
    'A seta da marca deve ser coral ou laranja?',
    'A seta fica em coral #FC4B55, como nos SVGs oficiais; o texto de referência citava laranja.',
    'Logotipo em todas as telas e nos ícones do aplicativo.',
    `${DOC} §2`,
    ['Coral, como nos SVGs oficiais', 'Laranja'],
  ),
  item(
    'P05',
    'Identidade visual',
    5,
    'A largura do menu lateral está adequada à identidade visual?',
    'Menu lateral com 17,5rem no computador, 16rem no celular e 18rem no tablet, para caber ícone, título e seta sem cortar.',
    'Menu de todas as áreas internas.',
    `${DOC} §2 e §6.9`,
  ),
  item(
    'P06',
    'Identidade visual',
    6,
    'Os padrões gráficos recriados em SVG estão fiéis à prancha 08?',
    'Padrões recriados em SVG a partir da prancha (galeria em docs/padroes/galeria.html).',
    'Faixas e fundos decorativos da entrada, do menu e dos destaques.',
    `${DOC} §2.1`,
  ),
  item(
    'P07',
    'Identidade visual',
    7,
    'Os ícones do aplicativo instalado estão aprovados?',
    'Ícones do aplicativo gerados a partir do símbolo da marca, com fundo branco no ícone adaptável (Android).',
    'Ícone na tela inicial do celular e do computador após instalar o aplicativo.',
    `${DOC} §5`,
  ),
  item(
    'P08',
    'Identidade visual',
    8,
    'A fonte Montserrat, hospedada com o aplicativo, tem a confirmação institucional?',
    'Montserrat (licença SIL OFL) servida junto com o aplicativo, sem depender de serviço externo.',
    'Todos os textos do sistema.',
    `${DOC} §1`,
  ),
  item(
    'P09',
    'Pontuação',
    1,
    'Como as notas fracionárias devem ser arredondadas?',
    'Duas casas decimais, meio para cima, só no resultado de cada componente e no total; sem arredondamento intermediário.',
    'Cálculo de todos os componentes, total do encontro e ranking.',
    `${DOC} §3; PRD §10`,
  ),
  item(
    'P10',
    'Pontuação',
    2,
    'O teto de 10 pontos de descontos vale para quais penalidades?',
    'O teto vale para os descontos gerais de ocorrências; zerar a entrega por plágio não entra no teto.',
    'Decisão de ocorrências e pontuação do encontro.',
    `${DOC} §3`,
  ),
  item(
    'P11',
    'Pontuação',
    3,
    'Entrega com prorrogação ou impedimento registrado deve ter desconto de atraso?',
    'Com prorrogação ou impedimento registrado, não há desconto de atraso.',
    'Pontuação da entrega (critério organização).',
    `${DOC} §3`,
  ),
  item(
    'P12',
    'Pontuação',
    4,
    'O que fazer com penalidades repetidas pelo mesmo fato?',
    'Vale a primeira registrada; as demais são ignoradas e a tela informa quais foram.',
    'Ocorrências e pontuação do encontro.',
    `${DOC} §3`,
  ),
  item(
    'P13',
    'Pontuação',
    5,
    'Quais são os valores, a quantidade, a validade e a forma de entrega da premiação?',
    'Os itens de premiação são registrados como configuração da edição; valores, quantidade, validade e entrega estão a definir.',
    'Tela de premiação da coordenação.',
    `${DOC} §3`,
  ),
  item(
    'P14',
    'Pontuação',
    6,
    'Quando o encontro tem vários desafios ou listas, como somar a nota do componente?',
    'O componente é a média simples dos itens do encontro (o PRD não define a agregação).',
    'Pontuação de questões e de entrega em encontros com mais de um item.',
    `${DOC} §6.4`,
  ),
  item(
    'P15',
    'Pontuação',
    7,
    'Em equipe de três estudantes, como fica a pontuação de presença?',
    'A presença dos três é limitada ao máximo por equipe das regras (10 no piloto).',
    'Pontuação de presença dos trios.',
    `${DOC} §6.4`,
  ),
  item(
    'P16',
    'Pontuação',
    8,
    'As penalidades e os prazos de 24 horas estão de acordo com o regulamento?',
    'Penalidades e prazos de manifestação e de revisão (24 h) com os valores do PRD, aplicados às edições não encerradas.',
    'Ocorrências, manifestação e pedidos de revisão.',
    `${DOC} §6.5`,
  ),
  item(
    'P17',
    'Pontuação',
    9,
    'Como tratar nota da prova oficial que não está na escala de 0 a 100?',
    'Nota sem escala 0–100 e sem autorização confirmadas fica pendente; o sistema não converte escalas.',
    'Registro da prova oficial e resultado da equipe.',
    `${DOC} §6.5`,
  ),
  item(
    'P18',
    'Pontuação',
    10,
    'Os limites de proteção das regras da edição estão adequados?',
    'Até 20 critérios por rubrica, nomes com até 80 caracteres, de 0 a 4 casas decimais e de 1 a 20 encontros.',
    'Tela de regras da edição e das turmas.',
    `${DOC} §6.9`,
  ),
  item(
    'P19',
    'Pontuação',
    11,
    'A pontuação máxima da turma está correta para encontros com avaliação objetiva diferente?',
    'A pontuação máxima soma, nos encontros da turma, os componentes pelas regras de cada encontro (questões ou prova oficial).',
    'Regulamento da turma e painéis de progresso.',
    `${DOC} §6.9`,
  ),
  item(
    'P20',
    'Equipes e atividades',
    1,
    'Que limite de atraso mostrar num desafio que vale para várias turmas?',
    'A lista mostra o maior limite entre as turmas do desafio; o envio de cada equipe usa o da própria turma.',
    'Lista de desafios encerrados e envio das entregas.',
    `${DOC} §6.9`,
  ),
  item(
    'P21',
    'Equipes e atividades',
    2,
    'Qual o tamanho mínimo da justificativa para substituir integrante ou desfazer equipe?',
    'Justificativa com pelo menos 10 caracteres.',
    'Gestão das equipes pela coordenação, docentes e mentores.',
    `${DOC} §6`,
  ),
  item(
    'P22',
    'Equipes e atividades',
    3,
    'Os convites para formar equipe devem expirar ou ter limite por estudante?',
    'Convites não expiram e não há limite de convites por estudante.',
    'Formação das equipes pelos estudantes.',
    `${DOC} §6.2`,
  ),
  item(
    'P23',
    'Equipes e atividades',
    4,
    'Os nomes de equipe precisam de moderação?',
    'Sem moderação; docente ou mentor da turma pode renomear com justificativa.',
    'Nome das equipes nas telas e no ranking.',
    `${DOC} §6.2`,
  ),
  item(
    'P24',
    'Equipes e atividades',
    5,
    'Quem pode registrar prorrogação ou impedimento de entrega?',
    'Docente ou mentor da turma, ou a coordenação.',
    'Entregas e descontos de atraso.',
    `${DOC} §6.4`,
  ),
  item(
    'P25',
    'Acesso e edições',
    1,
    'O cadastro permanente de cursos e turmas e a instalação de uma só unidade atendem à unidade?',
    'Cursos e turmas são da unidade; correções chegam sozinhas às edições em preparação e, na edição ativa, por "Atualizar a partir do cadastro". Uma instalação atende uma unidade.',
    'Cadastro de cursos e turmas e gestão das edições.',
    `${DOC} §6.8`,
  ),
  item(
    'P26',
    'Acesso e edições',
    2,
    'A busca de pessoas da coordenação deve alcançar qualquer conta da instalação?',
    'A busca traz só contas que participam ou participaram de edições que a pessoa coordena, sem e-mail.',
    'Vínculo de estudantes e docentes às turmas.',
    `${DOC} §6.8`,
  ),
  item(
    'P27',
    'Acesso e edições',
    3,
    'O mentor vinculado a um curso deve atuar em todas as turmas dele?',
    'O mentor é vinculado ao curso e atua em todas as turmas do curso; vínculo direto de mentor a turma é recusado.',
    'Permissões de mentores nas turmas.',
    `${DOC} §6.8`,
  ),
  item(
    'P28',
    'Acesso e edições',
    4,
    'Uma edição encerrada pode ser reaberta?',
    'Edição encerrada não é reaberta; os dados dela só podem ser lidos.',
    'Encerramento da edição e todas as telas da edição encerrada.',
    `${DOC} §6.8`,
  ),
  item(
    'P29',
    'Comunicados e relatórios',
    1,
    'Os comunicados precisam de público por equipe ou por pessoa?',
    'O público é por perfil (todos, estudantes ou equipe docente), opcionalmente limitado a turmas; não há público por equipe ou por pessoa.',
    'Publicação de comunicados.',
    `${DOC} §6.7`,
  ),
  item(
    'P30',
    'Comunicados e relatórios',
    2,
    'Os limites de tamanho dos comunicados estão adequados?',
    'Título de 1 a 200 caracteres e texto de 1 a 5.000, sem formatação.',
    'Publicação de comunicados.',
    `${DOC} §6.7`,
  ),
  item(
    'P31',
    'Comunicados e relatórios',
    3,
    'Quantos itens as listas devem mostrar por página?',
    'Listas com busca mostram 10 itens por página.',
    'Listas de estudantes, equipes, entregas e demais listas com busca.',
    `${DOC} §6.1`,
  ),
  item(
    'P32',
    'Operação',
    1,
    'Qual provedor e qual remetente vão enviar os e-mails de convite e recuperação de senha?',
    'Os e-mails de convite e de recuperação de senha dependem do provedor e do remetente da unidade, ainda não definidos.',
    'Criação de contas, primeiro acesso e "Esqueci minha senha".',
    `${DOC} §5; docs/operacao-e-homologacao.md; docs/adr/0009-convites-de-acesso.md`,
  ),
];

/** Resolvida por spec (P25) ou por decisão do projeto (todas as demais), como no banco. */
function resolvidaPor(codigo: string): string {
  return codigo === 'P25' ? 'spec 016' : 'decisão do projeto de 06/11/2026';
}

const RESPOSTAS_FICTICIAS: Record<string, Resposta[]> = {
  P02: [
    {
      id: 'demo-r1',
      decisao: 'confirmada',
      justificativa: 'Fictício: a prancha confere com o ícone redesenhado.',
      autorNome: 'Master Fictício',
      registradoEm: '2026-11-03T13:00:00.000Z',
    },
  ],
  P06: [
    {
      id: 'demo-r2',
      decisao: 'confirmada',
      justificativa: 'Fictício: o padrão recriado parece fiel à prancha.',
      autorNome: 'Master Fictício',
      registradoEm: '2026-11-02T12:00:00.000Z',
    },
    {
      id: 'demo-r3',
      decisao: 'precisa_mudar',
      justificativa: 'Fictício: falta o padrão da prancha 08 na galeria.',
      autorNome: 'Master Fictício',
      registradoEm: '2026-11-04T15:30:00.000Z',
    },
  ],
};

/** Premissas da demonstração: catálogo real com respostas fictícias; registrar é recusado. */
export function criarPremissasDemo(ehMaster: () => boolean): RepositorioPremissas {
  return {
    async premissas(): Promise<CatalogoDePremissas> {
      return {
        podeResponder: ehMaster(),
        premissas: CATALOGO_PREMISSAS.map((p) => {
          const historico = RESPOSTAS_FICTICIAS[p.codigo] ?? [];
          const atual = historico.at(-1) ?? null;
          return {
            ...p,
            resolvidaPor: resolvidaPor(p.codigo),
            situacao: atual?.decisao ?? 'aguardando',
            atual,
            historico,
          };
        }),
      };
    },
    responder: () =>
      Promise.reject(new Error('Indisponível no modo demonstração: a gravação exige o servidor.')),
  };
}
