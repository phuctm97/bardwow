#!/usr/bin/env node
const path = require("path");
const childProcess = require("child_process");
const semver = require("semver");
const cwd = path.resolve(__dirname, "..");
const workspaces = JSON.parse(
  childProcess.execSync("npm query .workspace", { cwd }).toString()
);
const workspaceDeps = workspaces.map((workspace) => workspace.name);
const versionedDeps = ["@types/node"];
const filteredDep = (dep) => !workspaceDeps.includes(dep);
const rangedDeps = {};
const rangedDep = (packageJson, dep) => {
  if (!versionedDeps.includes(dep)) return `${dep}@latest`;
  if (!rangedDeps[dep]) {
    const packageRange =
      packageJson.dependencies[dep] ?? packageJson.devDependencies[dep];
    const packageVersion = semver.coerce(packageRange);
    if (!packageVersion) throw new Error(`No package version for ${dep}.`);
    const versions = JSON.parse(
      childProcess
        .execSync(`npm view ${dep} versions --json`, { cwd })
        .toString()
    );
    const latestVersion = versions
      .filter(
        (version) =>
          semver.gte(version, packageVersion) &&
          semver.satisfies(version, packageRange)
      )
      .sort(semver.rcompare)[0];
    if (!latestVersion) throw new Error(`No latest version for ${dep}.`);
    const latestRange = packageRange.replace(packageVersion, latestVersion);
    rangedDeps[dep] = `${dep}@${latestRange}`;
  }
  return rangedDeps[dep];
};
const packages = [{ name: "root", path: cwd }, ...workspaces];
for (const package of packages) {
  console.log(`Updating ${package.name}…`);
  const packageJson = require(path.resolve(package.path, "package.json"));
  const packageFlags = package.path === cwd ? "" : ` -w ${package.name}`;
  const deps = Object.keys(packageJson.dependencies ?? {})
    .filter(filteredDep)
    .map((dep) => rangedDep(packageJson, dep));
  if (deps.length > 0)
    childProcess.execSync(`npm i ${deps.join(" ")}${packageFlags}`, {
      stdio: "ignore",
      cwd,
    });
  const devDeps = Object.keys(packageJson.devDependencies ?? {})
    .filter(filteredDep)
    .map((dep) => rangedDep(packageJson, dep));
  if (devDeps.length > 0)
    childProcess.execSync(`npm i -D ${devDeps.join(" ")}${packageFlags}`, {
      stdio: "ignore",
      cwd,
    });
}
