import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import dts from 'rollup-plugin-dts';
import typescript from 'rollup-plugin-typescript2';

import pkg from './package.json';

export default [
  {
    input: './index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      typescript({
        rollupCommonJSResolveHack: true,
        clean: true,
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            declarationDir: 'temp'
          }
        }
      }),
      external(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**'
      }),
      resolve(),
      commonjs()
    ]
  },
  {
    // TypeScript Type Definitions
    input: 'temp/index.d.ts',
    plugins: [dts()],
    output: { file: 'dist/index.d.ts', format: 'esm' }
  }
];
