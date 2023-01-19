module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/strict",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["tsconfig.json"]
  },
  plugins: ["@typescript-eslint", "import"],
  root: true,
  settings: {
    "import/resolver": {
      typescript: true,
      node: true
    }
  },
  rules: {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: ["variable", "function", "variableLike"],
        format: ["camelCase"]
      }
    ]
  }
};
