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
 * - TypeScript support (when .ts/.tsx files exist)
 */

const fs = require('fs');

// Try to load TypeScript plugin, fallback to not using it
let ForkTsCheckerWebpackPlugin;
try {
  ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
} catch (e) {
  console.warn('fork-ts-checker-webpack-plugin not installed. Type checking disabled.');
}

// Check if TypeScript entry file exists
const tsEntryExists = fs.existsSync(path.resolve(__dirname, './src/renderer/app.tsx'));

module.exports = (env, argv) => {
  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [];

  // Add type checking plugin if available and using TypeScript
  if (ForkTsCheckerWebpackPlugin && tsEntryExists) {
    plugins.push(new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: path.resolve(__dirname, 'tsconfig.json')
      },
      logger: 'webpack-infrastructure'
    }));
  }

  // Copy index.html to output directory
  plugins.push(new CopyWebpackPlugin({
    patterns: [
      { from: 'src/renderer/index.html', to: 'index.html' }
    ]
  }));

  // Bundle analyzer for production builds
  if (isProduction) {
    plugins.push(new (require('webpack-bundle-analyzer')).BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
      generateStatsFile: false
    }));
  }

  // Use .tsx entry if exists, otherwise fallback to .jsx
  const entry = tsEntryExists ? './src/renderer/app.tsx' : './src/renderer/app.jsx';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: entry,
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
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: [
            // Only use ts-loader if TypeScript entry file exists
            ...(tsEntryExists ? [{
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                compilerOptions: {
                  module: 'esnext',
                  moduleResolution: 'node',
                  jsx: 'react-jsx'
                }
              }
            }] : []),
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react', ...(tsEntryExists ? ['@babel/preset-typescript'] : [])]
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
    plugins
  };
};
