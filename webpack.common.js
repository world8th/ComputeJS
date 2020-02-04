const path = require('path');

module.exports = {
	mode: 'development',
	context: path.join(__dirname, 'src'),
	entry: {
		app: './webgpu.ts'
	},
	output: {
		filename: 'webgpu.js',
		path: path.resolve(__dirname, 'build')
	},
	resolve: {
		extensions: [ '.ts', '.tsx' ]
	},

	module: {
		rules: [
			{
				test: /\.ts/,
				exclude: /node_modules/,
				loader: 'ts-loader',
				options: {
					transpileOnly: true
				}
			}
		]
	}
};
