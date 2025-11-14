const path = require('path');

module.exports = [
  {
    mode: 'development',
    entry: './src/renderer/app.jsx',
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'src/renderer'),
      filename: 'app.js'
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { electron: '28' } }],
                ['@babel/preset-react', { runtime: 'automatic' }]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    devtool: 'source-map'
  }
];

