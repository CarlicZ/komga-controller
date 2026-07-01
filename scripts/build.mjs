import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'src');
const dist = resolve(root, 'dist');
const bannerPath = resolve(src, 'banner.txt');
const entryPoint = resolve(src, 'index.js');
const outFile = resolve(dist, 'komga-controller.user.js');
const tmpFile = resolve(dist, 'komga-controller.user.js.tmp');

const watch = process.argv.includes('--watch');

const banner = readFileSync(bannerPath, 'utf-8').trimEnd();

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: [entryPoint],
  outfile: tmpFile,
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false,
  keepNames: true,
  banner: {
    js: banner,
  },
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('[komga-controller] Watching for changes...');
    console.log(`[komga-controller] Output: ${outFile}`);
  } else {
    await esbuild.build(config);
    // esbuild banner option prepends the banner, so we just need to copy
    writeFileSync(outFile, readFileSync(tmpFile, 'utf-8'));
    unlinkSync(tmpFile);
    console.log(`[komga-controller] Built: ${outFile}`);
  }
}

// For watch mode, we need post-build processing
const origConfig = { ...config };
if (watch) {
  config.plugins = [{
    name: 'post-build',
    setup(build) {
      build.onEnd(() => {
        writeFileSync(outFile, readFileSync(tmpFile, 'utf-8'));
        unlinkSync(tmpFile);
        console.log(`[komga-controller] Rebuilt at ${new Date().toLocaleTimeString()}`);
      });
    },
  }];
}

run().catch((err) => {
  console.error('[komga-controller] Build failed:', err);
  process.exit(1);
});
