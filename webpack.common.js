const path = require('path');
const webgpu = `webgpu`, grayscale = `grayscale`, grayscaleWG = `grayscaleWG`, instance = `instance`;

module.exports = (entry = {[webgpu]: `./${webgpu}.ts`, [grayscale]: `./${grayscale}.ts`, [grayscaleWG]:`./${grayscaleWG}.ts`}) => { return {
	mode: 'development',
	context: path.join(__dirname, 'src'), entry,
	output: {
		filename: `[name].js`,
		path: path.resolve(__dirname, 'build')
	},
	resolve: {
		extensions: [ '.ts', '.tsx' ]
	},
	devtool: 'inline-source-map',
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
};};
