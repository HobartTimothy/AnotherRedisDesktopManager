'use strict'
const path = require('path')
const utils = require('./utils')
const config = require('../config')
const vueLoaderConfig = require('./vue-loader.conf')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  context: path.resolve(__dirname, '../'),
  entry: {
    app: './src/main.js'
  },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production'
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath
  },
  target: 'electron-renderer',
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      '@': resolve('src'),
    }
  },
  externals: {
    // native/optional bindings loaded at runtime
    'cpu-features': 'commonjs cpu-features',
    ssh2: 'commonjs ssh2',
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        loader: "node-loader",
        options: {
          // map sourceMap
          name(resourcePath, resourceQuery) {
            if (process.env.NODE_ENV === "development") {
              return "[path][name].[ext]";
            }

            return "[contenthash].[ext]";
          },
        },
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderConfig,
        // include: [
        //   resolve('src'), resolve('test'),
        //   // resolve('node_modules/@qii404/vue-easy-tree/src/')
        // ],
      },
      {
        test: /\.c?m?js$/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
        include: [
          resolve('src'),
          resolve('test'),
          resolve('node_modules/pickleparser'),
          resolve('node_modules/rawproto'),
        ]
      },
      {
        test: /rawproto\.cjs$/,
        type: 'javascript/auto',
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('img/[name].[hash:7].[ext]'),
          esModule: false,
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('media/[name].[hash:7].[ext]'),
          esModule: false,
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: utils.assetsPath('fonts/[name].[hash:7][ext]'),
          publicPath: '../../',
        },
      },

    ]
  }
}
