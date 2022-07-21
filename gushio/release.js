const path = require('path');
const shellJs = require('shelljs');
const { Confirm, Select } = require("enquirer");
const readPackageJsonFunction = require('./read-package-json-func');
const writePackageJsonFunction = require('./write-package-json-func');

const releaseFunctions = {
  "core": releaseCore,
  "cli": releaseCli,
  "desktop-app": releaseDesktopApp
};

module.exports = {
  cli: {
    name: "leapp-release",
    description: "This CLI allows you to guide you through Core, CLI, and Desktop App releases.",
    version: "0.1.0",
  },
  run: async () => {
    try {
      let target;
      const prompt = new Select({
        name: "target",
        message: "What are you going to deploy?",
        choices: ["core", "cli", "desktop-app"]
      });
      target = await prompt.run();

      let version = await console.input(
        {
          type: 'input',
          name: 'version',
          message: 'Specify the version (example: 0.1.0):'
        },
      );
      const regex = /^([0-9]+)\.([0-9]+)\.([0-9]+)/g;
      const found = version.version.match(regex);
      if(!found) {
        throw new Error(`version ${version.version} is not a valid SemVer version.`);
      }

      const releaseFunction = releaseFunctions[target];
      await releaseFunction(version.version);
    } catch(e) {
      e.message = e.message.red;
      throw e;
    }
  },
}

function checkVersion(wantedVersion, currentVersion) {
  const wantedVersionComponents = wantedVersion.split(".");
  const wantedMajor = wantedVersionComponents[0];
  const wantedMinor = wantedVersionComponents[1];
  const wantedPatch = wantedVersionComponents[2];

  const currentVersionComponents = currentVersion.split(".");
  const currentMajor = currentVersionComponents[0];
  const currentMinor = currentVersionComponents[1];
  const currentPatch = currentVersionComponents[2];

  if(wantedMajor < currentMajor) {
    throw new Error(`the wanted version (${wantedVersion}) could not be less than the current one (${currentVersion})`);
  } else if(wantedMinor < currentMinor) {
    throw new Error(`the wanted version (${wantedVersion}) could not be less than the current one (${currentVersion})`);
  } else if(wantedPatch < currentPatch) {
    throw new Error(`the wanted version (${wantedVersion}) could not be less than the current one (${currentVersion})`);
  }
}

async function updatePackageJsonVersion(packageName, version) {
  const packageJson = await readPackageJsonFunction(path, packageName);
  checkVersion(version, packageJson["version"]);
  packageJson["version"] = version;
  await writePackageJsonFunction(path, packageName, packageJson);
}

async function releaseCore(version) {
  console.log("Update Leapp Core's package.json version...");
  const packageName = "core";
  await updatePackageJsonVersion(packageName, version);
  let result = shellJs.exec("git add .");
  if (result.code !== 0) {
    throw new Error(result.stderr)
  }
  result = shellJs.exec(`git commit -m "chore(release): release core v${version}"`);
  if (result.code !== 0) {
    throw new Error(result.stderr)
  }
  result = shellJs.exec(`git tag -a core-vx.x.x -m "release core v${version}"`);
  if (result.code !== 0) {
    throw new Error(result.stderr)
  }

  const prompt = new Confirm({
    name: 'question',
    message: 'Want to push?'
  });

  const wantToPush = await prompt.run();

  if(wantToPush) {
    console.log("Push it to the limit!!!");
  }
}

async function releaseCli(version) {
  console.log("Update Leapp CLI's package.json version...");
  const packageName = "cli";
  await updatePackageJsonVersion(packageName, version);
}

async function releaseDesktopApp(version) {
  console.log("Update Leapp Desktop App's package.json version...");
  const packageName = "desktop-app";
  await updatePackageJsonVersion(packageName, version);
}
