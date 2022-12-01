import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';


export default {
  input: 'index.js',
  output: {
    file: 'out/bundle.js',
    format: 'es'
  },
  plugins: [
    nodeResolve({ extensions: ['.js' ] }),
    commonjs({ include: ['node_modules/**'] }),
  ]
};