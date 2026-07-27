const packageJson = require("./package.json");

const productionConfig = packageJson.build;

module.exports = {
  ...productionConfig,
  appId: "com.corestudio.desktop.dev",
  productName: "CoreStudio Dev",
  extraMetadata: {
    ...productionConfig.extraMetadata,
    productName: "CoreStudio Dev",
  },
  directories: {
    ...productionConfig.directories,
    output: "release-dev",
  },
  mac: {
    ...productionConfig.mac,
    identity: null,
  },
};
