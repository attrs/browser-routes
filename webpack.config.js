var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: path.join(__dirname, 'routes.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'routes.js',
    library: 'Routes',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  devtool: 'source-map'
};
