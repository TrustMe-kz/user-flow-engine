#!/usr/bin/env node

import esbuild from 'esbuild';
import babelPlugin from '../babel-plugin.js';

await Promise.all([
    esbuild.build({
        entryPoints: [ 'src/index.ts' ],
        plugins: [ babelPlugin() ],
        loader: { '.css': 'text' },
        outfile: 'dist/index.cjs',
        platform: 'node',
        format: 'cjs',
        target: [ 'es2017' ],
        bundle: true,
        sourcemap: true,
        minify: true,
    }),

    esbuild.build({
        entryPoints: [ 'src/index.ts' ],
        loader: { '.css': 'text' },
        outfile: 'dist/index.js',
        platform: 'node',
        format: 'esm',
        target: [ 'es2017' ],
        bundle: true,
        sourcemap: true,
        minify: true,
    }),
]).catch(() => process.exit(1));
