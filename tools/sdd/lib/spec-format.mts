/**
 * Lecture et vérification des fichiers de la méthode : le PRD d'un produit (specs/prd-nom.md),
 * puis, pour chaque tranche, spec.md et plan.md (qui contient les tâches).
 * Logique pure : aucun accès au disque ici.
 */

export interface Problem {
  file: string;
  line: number;
  message: string;
}

export interface Task {
  id: string;
  done: boolean;
  /** Le premier scénario cité : `001-AS2`. */
  scenario: string;
  /** Tous les scénarios cités : `[001-AS2, AS3]` → `001-AS2`, `001-AS3`. */
  scenarios: string[];
  text: string;
  line: number;
  /** `Tâches`, ou `Corrections` pour celles ajoutées par /converge. */
  section: string;
}

export const SPEC_STATUSES = ['Brouillon', 'Validée', 'Implémentée'] as const;
export const PLAN_STATUSES = ['Brouillon', 'Validé'] as const;
export const PRD_STATUSES = ['Brouillon', 'Validé'] as const;

const PRD_SECTIONS = [
  'Problème',
  'Utilisateurs',
  'Proposition',
  'Mesure du succès',
  'Tranches',
  'Hors périmètre',
  'Hypothèses et risques',
];

const SPEC_SECTIONS = [
  'Contexte',
  'User stories',
  "Scénarios d'acceptation",
  'Hors périmètre',
  'Questions ouvertes',
];
const PLAN_SECTIONS = [
  'Résumé',
  'Fichiers par couche',
  'Données',
  'Erreurs',
  'Tests par scénario',
  'Tâches',
];
const MAX_PRD_LINES = 59;
const MAX_SPEC_LINES = 70;
const MAX_TASKS = 6;

const STATUS = /^\*\*Statut\*\*\s*:\s*(.*?)\s*$/;
const SCENARIO = /^### AS([1-9]\d*) — \S/;
const TRANCHE = /^### TR([1-9]\d*) — \S/;
const PRD_LINK = /^\*\*PRD\*\*\s*:\s*(specs\/prd-[a-z0-9-]+\.md)\s*,\s*(TR[1-9]\d*)\s*$/;
const TASK = /^- \[( |x)\] (T\d{2}) \[(\d{3})-(AS[1-9]\d*(?:, AS[1-9]\d*)*)\] (\S.*)$/;

interface Line {
  text: string;
  /** Numéro de ligne, à partir de 1. */
  line: number;
  /** Titre de la section `##` qui contient la ligne, sans son numéro. */
  section: string;
}

function lines(text: string): Line[] {
  let section = '';
  const all = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  return all.map((raw, index) => {
    // `## 2. Données` et `## Données` sont la même section : la numérotation est facultative.
    const heading = /^## (?:\d+\.\s+)?(.+?)\s*$/.exec(raw);
    if (heading?.[1]) section = heading[1];
    return { text: raw, line: index + 1, section };
  });
}

export function status(text: string): string | undefined {
  for (const { text: raw } of lines(text)) {
    const match = STATUS.exec(raw);
    if (match) return match[1];
  }
  return undefined;
}

export function scenarios(text: string): { id: string; line: number }[] {
  return lines(text).flatMap(({ text: raw, line }) => {
    const match = SCENARIO.exec(raw);
    return match ? [{ id: `AS${match[1]}`, line }] : [];
  });
}

export function tranches(text: string): { id: string; line: number }[] {
  return lines(text).flatMap(({ text: raw, line }) => {
    const match = TRANCHE.exec(raw);
    return match ? [{ id: `TR${match[1]}`, line }] : [];
  });
}

/** La ligne « **PRD** : specs/prd-nom.md, TR1 » d'une spec, si elle en a une. */
export function prdLink(text: string): { file: string; tranche: string; line: number } | undefined {
  for (const { text: raw, line } of lines(text)) {
    const match = PRD_LINK.exec(raw);
    if (match?.[1] && match[2]) return { file: match[1], tranche: match[2], line };
  }
  return undefined;
}

export function tasks(text: string): Task[] {
  return lines(text).flatMap(({ text: raw, line, section }) => {
    const match = TASK.exec(raw);
    if (!match) return [];
    const [, box, id, number, cited, taskText] = match;
    const scenarios = (cited ?? '').split(', ').map((scenario) => `${number}-${scenario}`);
    return [
      {
        id: id ?? '',
        done: box === 'x',
        scenario: scenarios[0] ?? '',
        scenarios,
        text: taskText ?? '',
        line,
        section,
      },
    ];
  });
}

function checkStatus(
  file: string,
  text: string,
  allowed: readonly string[],
  problems: Problem[],
): void {
  const found = lines(text).find((l) => STATUS.test(l.text));
  const value = found && STATUS.exec(found.text)?.[1];
  if (!found || value === undefined) {
    problems.push({
      file,
      line: 1,
      message: `statut absent (ligne « **Statut** : ${allowed[0]} »)`,
    });
  } else if (!allowed.includes(value)) {
    problems.push({
      file,
      line: found.line,
      message: `statut « ${value} » inconnu (attendu : ${allowed.join(', ')})`,
    });
  }
}

function checkSections(file: string, text: string, required: string[], problems: Problem[]): void {
  const present = new Set(lines(text).map((l) => l.section));
  for (const section of required) {
    if (!present.has(section))
      problems.push({ file, line: 1, message: `section « ${section} » absente` });
  }
}

export function checkPrd(file: string, text: string): Problem[] {
  const problems: Problem[] = [];
  const all = lines(text);

  if (!/^# PRD — \S/.test(all[0]?.text ?? '')) {
    problems.push({ file, line: 1, message: 'le titre doit être « # PRD — Nom du produit »' });
  }
  checkStatus(file, text, PRD_STATUSES, problems);
  checkSections(file, text, PRD_SECTIONS, problems);
  if (all.length > MAX_PRD_LINES) {
    problems.push({
      file,
      line: MAX_PRD_LINES + 1,
      message: `le PRD fait ${all.length} lignes (${MAX_PRD_LINES} au plus) : une page suffit`,
    });
  }

  const found = tranches(text);
  const seen = new Set<string>();
  for (const { id, line } of found) {
    if (seen.has(id)) problems.push({ file, line, message: `tranche ${id} en double` });
    seen.add(id);
  }
  if (found.length === 0) {
    problems.push({ file, line: 1, message: 'aucune tranche (« ### TR1 — titre »)' });
  }
  return problems;
}

export function checkSpec(file: string, text: string, number: string): Problem[] {
  const problems: Problem[] = [];
  const all = lines(text);

  if (!new RegExp(`^# ${number} — \\S`).test(all[0]?.text ?? '')) {
    problems.push({ file, line: 1, message: `le titre doit être « # ${number} — Nom »` });
  }
  checkStatus(file, text, SPEC_STATUSES, problems);
  checkSections(file, text, SPEC_SECTIONS, problems);
  if (all.length > MAX_SPEC_LINES) {
    problems.push({
      file,
      line: MAX_SPEC_LINES + 1,
      message: `la spec fait ${all.length} lignes (${MAX_SPEC_LINES} au plus) : resserre-la`,
    });
  }

  const seen = new Set<string>();
  let current: { id: string; hasThen: boolean } | undefined;
  const closeScenario = () => {
    if (current && !current.hasThen) {
      problems.push({ file, line: 1, message: `le scénario ${current.id} n'a pas de « Alors »` });
    }
  };
  for (const { text: raw, line } of all) {
    if (raw.startsWith('#')) {
      closeScenario();
      current = undefined;
    }
    if (!raw.startsWith('### ')) {
      if (current && /\bAlors\b/.test(raw)) current.hasThen = true;
      continue;
    }
    const match = SCENARIO.exec(raw);
    if (!match) {
      if (/^### +AS/i.test(raw)) {
        problems.push({
          file,
          line,
          message: `scénario mal formé : « ${raw} » (attendu « ### AS${seen.size + 1} — titre »)`,
        });
      }
      continue;
    }
    const id = `AS${match[1]}`;
    if (seen.has(id)) problems.push({ file, line, message: `scénario ${id} en double` });
    seen.add(id);
    current = { id, hasThen: false };
  }
  closeScenario();
  if (seen.size === 0) {
    problems.push({ file, line: 1, message: 'aucun scénario (« ### AS1 — titre »)' });
  }
  return problems;
}

export function checkPlan(
  file: string,
  text: string,
  number: string,
  specScenarios: string[],
): Problem[] {
  const problems: Problem[] = [];
  const all = lines(text);
  checkStatus(file, text, PLAN_STATUSES, problems);
  checkSections(file, text, PLAN_SECTIONS, problems);

  const planned = all
    .filter((l) => l.section === 'Tests par scénario')
    .map((l) => l.text)
    .join('\n');
  for (const id of specScenarios) {
    if (!new RegExp(`\\b${id}\\b`).test(planned)) {
      problems.push({ file, line: 1, message: `le scénario ${id} n'a pas de test prévu` });
    }
  }

  for (const { text: raw, line } of all) {
    if (raw.startsWith('- [') && !TASK.test(raw)) {
      problems.push({
        file,
        line,
        message: `tâche mal formée : « ${raw} » (attendu « - [ ] T01 [${number}-AS1] texte »)`,
      });
    }
  }

  const list = tasks(text);
  const ids = new Set<string>();
  for (const task of list) {
    if (ids.has(task.id)) {
      problems.push({ file, line: task.line, message: `tâche ${task.id} en double` });
    }
    ids.add(task.id);
    for (const cited of task.scenarios) {
      const [taskNumber, scenario] = cited.split('-');
      if (taskNumber !== number) {
        problems.push({
          file,
          line: task.line,
          message: `${cited} n'appartient pas à la spec ${number}`,
        });
      } else if (!specScenarios.includes(scenario ?? '')) {
        problems.push({ file, line: task.line, message: `${cited} absent de la spec` });
      }
    }
  }
  const plannedTasks = list.filter((t) => t.section === 'Tâches').length;
  if (plannedTasks > MAX_TASKS) {
    problems.push({
      file,
      line: 1,
      message: `${plannedTasks} tâches (${MAX_TASKS} au plus) : regroupe-les`,
    });
  }
  return problems;
}
