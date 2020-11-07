#!/bin/bash
tsc
npx webpack --config webpack.config.js
# gzipped file for embedding
gzip -kqf dist/meshtastic.js