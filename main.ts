import { readFileSync, writeFileSync } from 'node:fs';
import { setFlagsFromString } from 'node:v8';
setFlagsFromString('--no-incremental-marking');
const { run } = await import('./solve.js');
const cases = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const answers = cases.map((c: { input: unknown }) => run(c.input as Parameters<typeof run>[0]));
writeFileSync('/output/answers.json', JSON.stringify(answers));
