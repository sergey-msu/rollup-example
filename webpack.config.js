const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  mode: "development",
  entry: ["buffer", "./src/app.ts"],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".webpack.js", ".web.js", ".ts", ".js"],
    modules: [path.join(__dirname, "node_modules")],
    fallback: {
      buffer: require.resolve("buffer"),
    },
  },
  module: {
    rules: [{ test: /\.ts$/, loader: "ts-loader" }],
  },
  devServer: {
    open: true,
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new HtmlWebpackPlugin({
      template: "public/index.html",
    }),
  ],
};
