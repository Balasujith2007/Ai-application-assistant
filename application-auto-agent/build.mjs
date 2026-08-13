import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const watch = process.argv.includes('--watch');

mkdirSync('dist/icons', { recursive: true });

const common = {
  bundle: true,
  target: 'es2022',
  sourcemap: true,
  logLevel: 'info',
};

async function build() {
  await esbuild.build({
    ...common,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: 'dist/background.js',
    format: 'iife',
  });

  await esbuild.build({
    ...common,
    entryPoints: ['src/content/content-script.ts'],
    outfile: 'dist/content.js',
    format: 'iife',
  });

  await esbuild.build({
    ...common,
    entryPoints: ['src/ui/popup/popup.ts'],
    outfile: 'dist/popup.js',
    format: 'iife',
  });

  copyFileSync('manifest.json', 'dist/manifest.json');
  copyFileSync('src/ui/popup/index.html', 'dist/popup.html');
  copyFileSync('src/ui/popup/popup.css', 'dist/popup.css');
  writeSimpleIcons();
  console.log('Apply Agent built → dist/');
}

function writeSimpleIcons() {
  // Minimal valid 1x1 PNG scaled conceptually; browsers accept small PNGs as icons.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVR4nO3OMQEAAAgDoK3/sP2hC6Qb0AAAAAAAAAAAAAAAAAAAAOA1cQ0AAcG1v6kAAAAASUVORK5CYII=',
    'base64',
  );
  if (!existsSync('dist/icons')) mkdirSync('dist/icons', { recursive: true });
  writeFileSync('dist/icons/icon16.png', png);
  writeFileSync('dist/icons/icon48.png', png);
  writeFileSync('dist/icons/icon128.png', png);
}

if (watch) {
  const ctxBg = await esbuild.context({
    ...common,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: 'dist/background.js',
    format: 'iife',
  });
  const ctxCs = await esbuild.context({
    ...common,
    entryPoints: ['src/content/content-script.ts'],
    outfile: 'dist/content.js',
    format: 'iife',
  });
  const ctxPop = await esbuild.context({
    ...common,
    entryPoints: ['src/ui/popup/popup.ts'],
    outfile: 'dist/popup.js',
    format: 'iife',
  });
  copyFileSync('manifest.json', 'dist/manifest.json');
  copyFileSync('src/ui/popup/index.html', 'dist/popup.html');
  copyFileSync('src/ui/popup/popup.css', 'dist/popup.css');
  writeSimpleIcons();
  await Promise.all([ctxBg.watch(), ctxCs.watch(), ctxPop.watch()]);
  console.log('Watching Apply Agent…');
} else {
  await build();
}

void dirname;
