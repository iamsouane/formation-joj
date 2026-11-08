import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PLAN, PRD, SPEC } from './fixtures.mts';
import {
  checkPlan,
  checkPrd,
  checkSpec,
  prdLink,
  scenarios,
  tasks,
  tranches,
} from './spec-format.mts';

const messages = (problems: { message: string }[]) => problems.map((p) => p.message);

describe('checkSpec', () => {
  it('accepts a well-formed spec', () => {
    assert.deepEqual(checkSpec('spec.md', SPEC, '001'), []);
  });

  it('reads the scenarios with their line', () => {
    assert.deepEqual(scenarios(SPEC), [
      { id: 'AS1', line: 15 },
      { id: 'AS2', line: 21 },
    ]);
  });

  it('reports a missing section', () => {
    const problems = checkSpec('spec.md', SPEC.replace('## Hors périmètre', '## Autre'), '001');
    assert.match(messages(problems).join('\n'), /section « Hors périmètre » absente/);
  });

  it('reports an unknown or missing status', () => {
    assert.match(
      messages(checkSpec('spec.md', SPEC.replace('Brouillon', 'Finie'), '001')).join('\n'),
      /statut « Finie » inconnu.*Brouillon, Validée, Implémentée/,
    );
    assert.match(
      messages(checkSpec('spec.md', SPEC.replace('**Statut** : Brouillon', ''), '001')).join(),
      /statut absent/,
    );
  });

  it('reports a malformed or duplicated scenario id, with its line', () => {
    const malformed = checkSpec('spec.md', SPEC.replace('### AS2 —', '### AS 2 —'), '001');
    assert.deepEqual(malformed, [
      {
        file: 'spec.md',
        line: 21,
        message:
          'scénario mal formé : « ### AS 2 — Créneau complet » (attendu « ### AS2 — titre »)',
      },
    ]);
    const duplicated = checkSpec('spec.md', SPEC.replace('### AS2 —', '### AS1 —'), '001');
    assert.match(messages(duplicated).join(), /AS1 en double/);
  });

  it('requires at least one scenario, each with an « Alors »', () => {
    const noThen = SPEC.replace("- **Alors** l'inscription est refusée", '');
    assert.match(messages(checkSpec('spec.md', noThen, '001')).join(), /AS2 n'a pas de « Alors »/);
    const none = SPEC.replace(/### AS[\s\S]*?(?=## Hors)/, '');
    assert.match(messages(checkSpec('spec.md', none, '001')).join(), /aucun scénario/);
  });

  it('limits the spec to 70 lines', () => {
    const long = SPEC + '\n'.repeat(40);
    assert.match(messages(checkSpec('spec.md', long, '001')).join(), /73 lignes \(70 au plus\)/);
  });

  it('checks that the title carries the number of the folder', () => {
    assert.match(messages(checkSpec('spec.md', SPEC, '002')).join(), /« # 002 — Nom »/);
  });
});

describe('tasks', () => {
  it('reads the tasks of the plan, done or not', () => {
    assert.deepEqual(tasks(PLAN), [
      {
        id: 'T01',
        done: true,
        scenario: '001-AS1',
        scenarios: ['001-AS1'],
        text: "Écrire d'abord domain/inscription.spec.ts, puis l'entité",
        line: 32,
        section: 'Tâches',
      },
      {
        id: 'T02',
        done: false,
        scenario: '001-AS2',
        scenarios: ['001-AS2'],
        text: "Écrire d'abord test/benevoles.e2e.spec.ts, puis la route",
        line: 33,
        section: 'Tâches',
      },
    ]);
  });
});

describe('tasks with several scenarios', () => {
  it('reads a task that cites several scenarios of the spec', () => {
    const plan = PLAN.replace('T02 [001-AS2]', 'T02 [001-AS2, AS3]');
    assert.deepEqual(tasks(plan)[1]?.scenarios, ['001-AS2', '001-AS3']);
    assert.equal(tasks(plan)[1]?.scenario, '001-AS2');
  });
});

describe('checkPlan', () => {
  const ids = ['AS1', 'AS2'];

  it('accepts a well-formed plan', () => {
    assert.deepEqual(checkPlan('plan.md', PLAN, '001', ids), []);
  });

  it('accepts only Brouillon or Validé', () => {
    assert.equal(checkPlan('plan.md', PLAN.replace('Brouillon', 'Validé'), '001', ids).length, 0);
    assert.match(
      messages(checkPlan('plan.md', PLAN.replace('Brouillon', 'Validée'), '001', ids)).join(),
      /statut « Validée » inconnu/,
    );
  });

  it('requires a planned test for every scenario', () => {
    const problems = checkPlan('plan.md', PLAN, '001', ['AS1', 'AS2', 'AS3']);
    assert.match(messages(problems).join(), /AS3 n'a pas de test prévu/);
  });

  it('reports a malformed task line', () => {
    const problems = checkPlan('plan.md', PLAN.replace('T02 [001-AS2]', 'T2 [AS2]'), '001', ids);
    assert.deepEqual(problems, [
      {
        file: 'plan.md',
        line: 33,
        message:
          "tâche mal formée : « - [ ] T2 [AS2] Écrire d'abord test/benevoles.e2e.spec.ts, puis la route » (attendu « - [ ] T01 [001-AS1] texte »)",
      },
    ]);
  });

  it('reports a duplicated task, an unknown scenario and a scenario of another spec', () => {
    const plan = PLAN.replace('T02 [001-AS2]', 'T01 [001-AS2, AS9]');
    const text = messages(checkPlan('plan.md', plan, '001', ids)).join('\n');
    assert.match(text, /T01 en double/);
    assert.match(text, /001-AS9 absent de la spec/);
    const other = messages(
      checkPlan('plan.md', PLAN.replace('[001-AS2]', '[002-AS2]'), '001', ids),
    ).join();
    assert.match(other, /002-AS2 n'appartient pas à la spec 001/);
  });

  it('allows 6 tasks at most, corrections not counted', () => {
    const lines = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => {
        const id = String(from + i).padStart(2, '0');
        return `- [ ] T${id} [001-AS1] tâche ${id}`;
      }).join('\n');
    const seven = PLAN.replace(/## 6\. Tâches[\s\S]*$/, `## 6. Tâches\n\n${lines(1, 7)}\n`);
    assert.match(
      messages(checkPlan('plan.md', seven, '001', ids)).join(),
      /7 tâches \(6 au plus\)/,
    );

    const corrected = PLAN.replace(
      /## 6\. Tâches[\s\S]*$/,
      `## 6. Tâches\n\n${lines(1, 6)}\n\n## 7. Corrections\n\n### Passage 1\n\n${lines(7, 2)}\n`,
    );
    assert.deepEqual(checkPlan('plan.md', corrected, '001', ids), []);
    assert.deepEqual(
      tasks(corrected)
        .filter((t) => t.section === 'Corrections')
        .map((t) => t.id),
      ['T07', 'T08'],
    );
  });

  it('requires a summary first, numbered sections being optional', () => {
    const noSummary = PLAN.replace(/## 1\. Résumé\n\n.*\n\n/, '');
    assert.match(
      messages(checkPlan('plan.md', noSummary, '001', ids)).join(),
      /section « Résumé » absente/,
    );
    const unnumbered = PLAN.replace(/^## \d+\. /gm, '## ');
    assert.deepEqual(checkPlan('plan.md', unnumbered, '001', ids), []);
  });

  it('requires the sections of the plan', () => {
    const problems = checkPlan(
      'plan.md',
      PLAN.replace('## 4. Erreurs', '## 4. Soucis'),
      '001',
      ids,
    );
    assert.match(messages(problems).join(), /section « Erreurs » absente/);
  });
});

describe('checkPrd', () => {
  it('accepts a well-formed PRD and reads its slices', () => {
    assert.deepEqual(checkPrd('prd.md', PRD), []);
    assert.deepEqual(tranches(PRD), [
      { id: 'TR1', line: 23 },
      { id: 'TR2', line: 27 },
    ]);
  });

  it('requires the title, a known status and every section', () => {
    const problems = messages(
      checkPrd(
        'prd.md',
        PRD.replace('# PRD — Bénévoles', '# Bénévoles')
          .replace('Brouillon', 'Validée')
          .replace('## Mesure du succès', '## Autre'),
      ),
    ).join('\n');
    assert.match(problems, /« # PRD — Nom du produit »/);
    assert.match(problems, /statut « Validée » inconnu.*Brouillon, Validé/);
    assert.match(problems, /section « Mesure du succès » absente/);
  });

  it('requires at least one slice, without duplicates', () => {
    const none = PRD.replace(/### TR[\s\S]*?(?=## Hors)/, '');
    assert.match(messages(checkPrd('prd.md', none)).join(), /aucune tranche/);
    const twice = PRD.replace('### TR2 —', '### TR1 —');
    assert.match(messages(checkPrd('prd.md', twice)).join(), /TR1 en double/);
  });

  it('limits the PRD to one page of 56 lines', () => {
    const long = PRD + '\n'.repeat(20);
    assert.match(messages(checkPrd('prd.md', long)).join(), /57 lignes \(56 au plus\)/);
  });
});

describe('prdLink', () => {
  it('reads the PRD and the slice a spec implements', () => {
    const spec = SPEC.replace(
      '**Statut** : Brouillon',
      '**Statut** : Brouillon\n**PRD** : specs/prd-benevoles.md, TR1',
    );
    assert.deepEqual(prdLink(spec), { file: 'specs/prd-benevoles.md', tranche: 'TR1', line: 4 });
  });

  it('is absent from a spec written without a PRD', () => {
    assert.equal(prdLink(SPEC), undefined);
  });
});
