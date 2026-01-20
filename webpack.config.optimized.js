const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/**
 * Optimized webpack configuration for PolyCode IDE
 *
 * Optimizations:
 * - Tree shaking
 * - Code splitting
 * - Minification
 * - Lazy loading
 * - Bundle analysis
 */

module.exports = (env, argv) => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/renderer/app.jsx',
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'dist/renderer'),
      filename: 'app.js',
      clean: true,
      // Code splitting configuration
      chunkFilename: '[name].js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]'
    },
    optimization: {
      minimize: isProduction,
      usedExports: isProduction
    },
    // Source maps for debugging
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.js', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      // Copy index.html to output directory
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/renderer/index.html', to: 'index.html' }
        ]
      }),
      // Bundle analyzer for production builds
      ...(isProduction ? [
        new (require('webpack-bundle-analyzer')).BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html',
          generateStatsFile: false
        })
      ] : [])
    ]
  };
};
