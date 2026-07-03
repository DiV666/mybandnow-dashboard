import fs from 'fs';
import { execSync } from 'child_process';

// Helper: rename a coverage file, or write an empty map if it doesn't exist.
// nyc merge accepts Istanbul-format JSON from any provider (vitest/v8, c8, etc.)
// and sums the hit counts across all files.
function moveCoverage(src, dest) {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved coverage: ${src} → ${dest}`);
  } else {
    fs.writeFileSync(dest, '{}');
    console.warn(`Coverage file not found (${src}), using empty placeholder for merge.`);
  }
}

moveCoverage('./.coverage-tmp/tests/unit/coverage-final.json', './.coverage-tmp/tests/unit.json');
moveCoverage('./.coverage-tmp/tests/integration/coverage-final.json', './.coverage-tmp/tests/integration.json');

console.log('Merging coverage reports...');
const mergedCommand = execSync('npm run coverage:merge', { encoding: 'utf-8' });
console.log(mergedCommand);

console.log('Creating coverage report...');
const createdCommand = execSync('npm run coverage:report', { encoding: 'utf-8' });
console.log(createdCommand);

fs.rmSync('./.coverage-tmp', { recursive: true, force: true });
fs.rmSync('./.nyc_output', { recursive: true, force: true });

console.log('---------------------------');
console.log('Finished coverage process!!');
console.log('---------------------------');
console.log('');
