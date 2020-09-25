Convert mesh.proto to json with
```
npx pbjs -t json proto/mesh.proto > proto/meshproto.json
```
then reencode file with utf-8, otherwise webpack can't read