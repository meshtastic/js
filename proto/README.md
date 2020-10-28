Convert mesh.proto to json es6 module with

```
npx pbjs -t json-module -w es6 proto/mesh.proto > src/protobufs/meshproto.js
```

then reencode file with utf-8, otherwise webpack can't read.

This generates an es6-module compatible js file which imports protobufjs library (which is not es6 module compatible, therefore a transpiler/bundler has to be used still).
