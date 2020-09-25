const path = require('path');

// Build for multiple targets
module.exports = [
  createConfig('var', true),
  createConfig('commonjs2'),
  createConfig('amd'),
  createConfig('umd')
];

function createConfig(target, defaultTarget) {

  // If default target, do not add target name to filename
  var filename;
  if (defaultTarget === true) {
    filename = 'meshtastic.js'
  } else {
    filename = 'meshtastic.' + target + '.js';
  }

  return {
    entry: './src/index.js',
    output: {
      library: 'meshtasticjs',
      libraryTarget: target,
      filename: filename,
      path: path.resolve(__dirname, 'dist'),
    },
    mode: 'production',
  }

}
