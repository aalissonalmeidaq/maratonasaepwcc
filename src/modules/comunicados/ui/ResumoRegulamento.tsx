import { Alert, Card, type NomeIcone } from '@/shared/ui';
import { resumoDoRegulamento } from '../domain/regulamento';

const ICONES: NomeIcone[] = ['pontuacao', 'prova'];

/**
 * Resumo das regras gravadas na edição (US4). Valor ausente aparece como "a definir"; o
 * regulamento oficial aprovado, ainda ausente, prevalece (docs/decisoes-e-pendencias.md).
 */
export function ResumoRegulamento({ regras, versao }: { regras: unknown; versao: string }) {
  const resumo = resumoDoRegulamento(regras);
  return (
    <div className="flex flex-col gap-4">
      <Alert tom="alerta" titulo="Resumo em validação: o regulamento oficial aprovado prevalece.">
        Regras da edição — versão {versao}. O regulamento aprovado será publicado pela coordenação
        quando existir.
      </Alert>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {resumo.grupos.map((g, i) => (
          <Card key={g.titulo} icone={ICONES[i]} titulo={g.titulo} nivel={3}>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {g.itens.map((item) => (
                <li key={item.rotulo}>
                  <span className="font-semibold">{item.rotulo}:</span>{' '}
                  {item.valor ?? <span className="text-text-secondary">a definir</span>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
