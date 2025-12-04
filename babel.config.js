'use strict';

module.exports = {
  presets: [
    ['@babel/preset-env', { modules: false, targets: { node: 'current' } }],
  ],
  sourceType: 'unambiguous',
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    '@babel/plugin-transform-runtime',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-transform-object-rest-spread',
  ],
};
