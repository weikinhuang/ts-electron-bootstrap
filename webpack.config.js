const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackNotifierPlugin = require('webpack-notifier');
const WebpackFailPlugin = require('webpack-fail-plugin');
const postcssAdvancedVariables = require('postcss-advanced-variables');
const postcssNested = require('postcss-nested');
const postcssAtRoot = require('postcss-atroot');
const postcssCssnext = require('postcss-cssnext');
const appPackage = require('./app/package.json');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
const isProduction = process.env.NODE_ENV === 'production';

// setup webpack plugins
const plugins = [
  // https://github.com/ampedandwired/html-webpack-plugin
  new HtmlWebpackPlugin({
    title: appPackage.appTitle,
    filename: '../index.html',
    template: 'src/index.template.ejs',
    inject: true,
    hash: true,
    xhtml: true,
    minify: {}
  }),
  new webpack.optimize.CommonsChunkPlugin({
    children: true,
    minChunks: 3
  }),
  new webpack.LoaderOptionsPlugin({
    options: {
      // https://github.com/postcss/postcss-loader
      postcss: function() {
        return [
          postcssAdvancedVariables,
          postcssAtRoot,
          postcssNested,
          postcssCssnext({ browsers: ['last 1 Chrome versions'] }),
        ];
      }
    }
  }),
  // NODE_ENV should be production so that modules do not perform certain development checks
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  })
];

const entryPre = [];
const entryPost = [];
let cssLoaders = (loaders) => loaders;
let devServer;
if (isProduction) {
  // UglifyJs does not work on ES2015+ code, switch to Babili
  // plugins.push(new webpack.optimize.UglifyJsPlugin({
  //   compress: {
  //     warnings: false
  //   }
  // }));
  plugins.push(new webpack.LoaderOptionsPlugin({  minimize: true, debug: false }));

  // https://github.com/webpack/extract-text-webpack-plugin
  plugins.push(new ExtractTextPlugin({ filename: 'styles.css', allChunks: true }));
  cssLoaders = (loaders) => {
    return ExtractTextPlugin.extract({
      fallbackLoader: 'style-loader',
      loader: loaders.filter((loader) => loader !== 'style-loader')
    });
  };
} else {
  // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
  plugins.push(new webpack.HotModuleReplacementPlugin());
  // https://github.com/webpack/docs/wiki/list-of-plugins#noerrorsplugin
  plugins.push(new webpack.NoErrorsPlugin());
  plugins.push(new WebpackNotifierPlugin());

  // https://github.com/webpack/webpack-dev-server
  entryPre.push('webpack-hot-middleware/client');
  // dev server config
  devServer = {
    hot: true,
    noInfo: true,
    stats: {
      colors: true,
      hash: false,
      version: false,
      timings: false,
      assets: false,
      chunks: false,
      modules: false,
      reasons: false,
      children: false,
      source: false,
      errors: true,
      errorDetails: true,
      warnings: false,
      publicPath: false
    }
  };
}

// plugins at the end
plugins.push(...[
  // https://github.com/TiddoLangerak/webpack-fail-plugin
  WebpackFailPlugin,
]);

// generalized set of default loader configurations
const rules = [
  // css
  // any files that end in `.global.css` are not css modules
  {
    test: /\.global\.css$/,
    loaders: cssLoaders([
      'style-loader',
      {
        loader: 'css-loader',
        query: {
          modules: false,
          minimize: isProduction,
          sourceMap: !isProduction,
          context: '/',
          importLoaders: true
        }
      },
      'postcss-loader',
    ])
  },
  // any files that do not end in `.global.css` are css modules
  {
    test: /^((?!\.global).)*\.css$/i,
    loaders: cssLoaders([
      'style-loader',
      {
        loader: 'css-loader',
        query: {
          modules: true,
          minimize: isProduction,
          sourceMap: !isProduction,
          context: '/',
          importLoaders: true,
          camelCase: true,
          localIdentName: '[name]__[local]___[hash:base64:5]'
        }
      },
      'postcss-loader',
      'typed-css-modules-loader',
    ])
  },
  // typescript
  {
    test: /\.tsx?$/i,
    include: [path.resolve('src')],
    loader: 'ts-loader'
  },
  // web workers
  // @see https://github.com/webpack/worker-loader
  {
    test: /\.worker\.js$/i,
    loader: 'worker-loader'
  },
  // images
  {
    test: /\.(?:ico|gif|png|jpg|jpeg|webp)$/i,
    loader: 'url-loader'
  },
  // fonts
  { test: /\.woff2?(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff' } },
  { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/octet-stream' } },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
  { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader', options: { limit: 10000, mimetype: 'image/svg+xml' } },
];

module.exports = {
  devtool: !isProduction ? '#source-map' : false,
  entry: [
    ...entryPre,
    'renderer/index.ts',
    ...entryPost,
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve('app/renderer'),
    publicPath: 'renderer/'
  },
  // https://webpack.github.io/docs/configuration.html#target
  target: 'electron-renderer',
  // https://webpack.github.io/docs/configuration.html#resolve
  resolve: {
    modules: [
      path.resolve('src'),
      'node_modules'
    ],
    extensions: ['.js', '.ts', '.tsx', '.css']
  },
  module: {
    rules
  },
  // no need to include election specific dependencies with the webpack bundle
  externals: Object.keys(appPackage.dependencies || {}),
  plugins,
  devServer
};
