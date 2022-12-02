import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from "rollup-plugin-node-polyfills";


export default {
  input: 'index.js',
  output: {
    file: 'out/bundle.js',
    format: 'es'
  },
  plugins: [
    nodePolyfills(),
    nodeResolve({ extensions: ['.js' ], browser: true }),
    commonjs({
      include: ['node_modules/**'],
    }),
    json()
  ]
};
