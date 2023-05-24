const defaultCommands = [
  "prettier --write --ignore-unknown",
  "cspell --no-must-find-files",
];

const jsExtensions = ["js", "mjs", "cjs", "jsx"];

const tsExtensions = jsExtensions.map((ext) => ext.replace("js", "ts"));

const lintExtensions = [...tsExtensions, ...jsExtensions];

const lintPatterns = `*.{${lintExtensions.join(",")}}`;

const lintCommands = [
  "eslint --fix --no-error-on-unmatched-pattern",
  ...defaultCommands,
];

/** @type {import('lint-staged').Config} */
const config = {
  [`!${lintPatterns}`]: defaultCommands,
  [lintPatterns]: lintCommands,
};

module.exports = config;
