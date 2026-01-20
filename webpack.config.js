const path = require('path');

module.exports = [
  {
    mode: 'development',
    entry: './src/renderer/app.tsx',
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'src/renderer'),
      filename: 'app.js'
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                compilerOptions: {
                  module: 'esnext',
                  moduleResolution: 'node',
                  jsx: 'react-jsx'
                }
              }
            },
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: { electron: '28' } }],
                  ['@babel/preset-react', { runtime: 'automatic' }],
                  '@babel/preset-typescript'
                ]
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    devtool: 'source-map'
  }
];

