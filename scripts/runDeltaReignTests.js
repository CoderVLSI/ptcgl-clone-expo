/**
 * Compiles and runs the Delta Reign behavioural checks.
 *
 * The effect engine is pure TypeScript with no React or bundler dependencies,
 * so it can be compiled to plain CommonJS and executed in Node.
 *
 * Run: node scripts/runDeltaReignTests.js
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const root = path.join(__dirname, '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delta-reign-tests-'));
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

if (!fs.existsSync(tsc)) {
    console.error('TypeScript not found. Run `npm install` first.');
    process.exit(1);
}

try {
    execFileSync(
        process.execPath,
        [
            tsc,
            'scripts/testDeltaReign.ts',
            'utils/deltaReignEffects.ts',
            'types/game.ts',
            '--outDir', outDir,
            '--module', 'commonjs',
            '--target', 'es2020',
            '--esModuleInterop',
            '--skipLibCheck',
            '--strict', 'false',
        ],
        { cwd: root, stdio: 'inherit' },
    );

    execFileSync(process.execPath, [path.join(outDir, 'scripts', 'testDeltaReign.js')], {
        cwd: root,
        stdio: 'inherit',
    });
} finally {
    fs.rmSync(outDir, { recursive: true, force: true });
}
