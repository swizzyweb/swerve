import { SwizzyWinstonLogger } from "@swizzyweb/swizzy-web-service";
import { getArgs } from "../dist/utils/getArgs.js";
import path from "node:path/posix";
import test from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = new SwizzyWinstonLogger({
  port: 80,
  appName: `AppName`,
  appDataRoot: "./log/test-log.json",
  hostName: "HOSTNAME",
  pid: process.pid,
});

test("getArgs", () => {
  test.it("Sets port and custom arg", async () => {
    const args = [
      "/path/to/package/",
      "run.js",
      "--port",
      "80",
      //"--appDataRoot",
      //      ".",
      "--someCustomArg",
      "JasonIsTheBest",
    ];
    let result = await getArgs(args, logger);
    assert.equal(result.port, 80);
    assert.equal(result.serviceArgs?.someCustomArg, "JasonIsTheBest");
  });

  test.it("sets appDataRoot", async () => {
    const args = [
      "/path/to/package/",
      "run.js",
      "--port",
      "80",
      "--appDataRoot",
      ".",
      "--someCustomArg",
      "JasonIsTheBest",
    ];
    let result = await getArgs(args, logger);
    assert.equal(result.port, 80);
    assert.equal(result.serviceArgs?.someCustomArg, "JasonIsTheBest");
  });

  test.it("Throws on invalid config file path", async () => {
    const configPath = "/some/invalid/path";
    const args = [
      "/path/to/package/",
      "run.js",
      "--port",
      "80",
      "--appDataRoot",
      ".",
      "--someCustomArg",
      "JasonIsTheBest",
      "--config",
      configPath,
    ];
    try {
      let result = await getArgs(args, logger);
    } catch (e) {
      assert.deepEqual(
        { message: e.message, configFilePath: configPath },
        {
          message:
            "Unexpected error occurred when attempting to read serviceConfiguration file",
          configFilePath: configPath,
        },
      );
    }
  });
  test.it("Should read config values from config", async () => {
    const configPath = path.join(__dirname, "./config/serviceConfig.json");
    const args = [
      "/path/to/package/",
      "run.js",
      "--port",
      "80",
      "--appDataRoot",
      ".",
      "--someCustomArg",
      "JasonIsTheBest",
      "--config",
      configPath,
    ];
    let result = await getArgs(args, logger);
    assert.equal(result.port, 3000);
    const service = result.services["my-first-web-service1"];
    assert.equal(result.serviceArgs?.someCustomArg, "JasonIsTheBest");

    assert.equal(service.someOtherArgFromConfig, "ThisIsTheArgValue");
    assert.equal(service.shouldTimeout, true);
    assert.deepEqual(service.nestedJson, {
      hello: "world",
      none: false,
    });
  });

  test.it(
    "Should override parameters in order of args, config file last",
    async () => {
      const configPath = path.join(__dirname, "./config/serviceConfig.json");
      const args = [
        "/path/to/package/",
        "run.js",
        "--port",
        "80",
        "--appDataRoot",
        ".",
        "--someCustomArg",
        "JasonIsTheBest",
        "--someNumberINeed",
        "1000",
        "--config",
        configPath,
      ];
      let result = await getArgs(args, logger);

      const service = result.services["my-first-web-service1"];
      assert.equal(service.someOtherArgFromConfig, "ThisIsTheArgValue");

      assert.equal(result.port, 3000);
      assert.equal(result.serviceArgs?.someCustomArg, "JasonIsTheBest");

      assert.equal(result.serviceArgs?.someNumberINeed, 1000);
      assert.equal(service.shouldTimeout, true);
      assert.deepEqual(service.nestedJson, {
        hello: "world",
        none: false,
      });
    },
  );

  test.it(
    "Should override parameters in order of args, config file first",
    async () => {
      const configPath = path.join(__dirname, "./config/serviceConfig.json");
      const args = [
        "/path/to/package/",
        "run.js",
        "--port",
        "80",
        "--appDataRoot",
        ".",
        "--someCustomArg",
        "JasonIsTheBest",
        "--config",
        configPath,
        "--someNumberINeed",
        "1000",
      ];
      let result = await getArgs(args, logger);
      const service = result.services["my-first-web-service1"];
      assert.equal(service.someOtherArgFromConfig, "ThisIsTheArgValue");
      assert.equal(result.port, 3000);
      assert.equal(result.appDataRoot, path.join(__dirname, ".."));
      assert.equal(result.appDataRoot, path.join(__dirname, ".."));
      assert.equal(result.serviceArgs?.someCustomArg, "JasonIsTheBest");

      assert.equal(result.serviceArgs?.someNumberINeed, 1000);
      assert.equal(service.shouldTimeout, true);
      assert.deepEqual(service.nestedJson, {
        hello: "world",
        none: false,
      });
    },
  );

  test.it("Should getService from args", async () => {
    const args = [
      "/path/to/package/",
      "run.js",
      path.join(__dirname, "../package.json"),
      "--port",
      "80",
      "--appDataRoot",
      ".",
      "--someCustomArg",
      "JasonIsTheBest",
    ];
    let result = await getArgs(args, logger);
    assert.equal(result.port, 80);

    const service = result.services["my-first-web-service1"];
    //    expect(result.serviceArgs.appDataRoot, ".");
    assert.equal(result.serviceArgs?.someCustomArg, "JasonIsTheBest");
  });

  test.it(
    "Should set appDataRoot to current package root by default",
    async () => {
      const configPath = path.join(__dirname, "./config/serviceConfig.json");
      const args = [
        "/path/to/package/",
        "run.js",
        "--port",
        "80",
        "--someCustomArg",
        "JasonIsTheBest",
        "--config",
        configPath,
        "--someNumberINeed",
        "1000",
      ];
      let result = await getArgs(args, logger);

      const service = result.services["my-first-web-service1"];
      assert.equal(service.someOtherArgFromConfig, "ThisIsTheArgValue");
      assert.equal(result.port, 3000);
      assert.equal(result.appDataRoot, path.join(__dirname, ".."));
      assert.equal(result.serviceArgs?.someCustomArg!, "JasonIsTheBest");

      assert.equal(result.serviceArgs?.someNumberINeed!, 1000);
      assert.equal(service.shouldTimeout, true);
      assert.deepEqual(service.nestedJson, {
        hello: "world",
        none: false,
      });
    },
  );
  test.it("Should create multiple services", async () => {
    const configPath = path.join(__dirname, "./config/serviceConfig.json");
    const args = [
      "/path/to/package/",
      "run.js",
      ".",
      "--port",
      "80",
      "--someCustomArg",
      "JasonIsTheBest",
      //      "--config",
      //      configPath,
      "--someNumberINeed",
      "1000",
      ".",
      "--port",
      "91",
    ];
    let result = await getArgs(args, logger);

    const service = result.services["my-first-web-service1"];
    assert.equal(result.port, 91);
    assert.equal(result.appDataRoot, path.join(__dirname, ".."));
    //   expect(service.someCustomArg, "JasonIsTheBest");

    //    expect(service.someNumberINeed, 1000);
    //    expect(service.shouldTimeout, true);
    //    expect(service.nestedJson, {
    //      hello: "world",
    //      none: false,
    //    });
    //    expect(result.services.length, 2);
  });
  test.it("Should create absolute path appdata directory", async () => {
    const configPath = path.join(__dirname, "./config/serviceConfig.json");
    const appDataRoot = "/tmp/swizzy-dyn-serve-web-service";
    const args = [
      "/path/to/package/",
      "run.js",
      ".",
      "--port",
      "80",
      "--someCustomArg",
      "JasonIsTheBest",
      //"--config",
      //configPath,
      "--someNumberINeed",
      "1000",
      ".",
      "--port",
      "91",
      "--appDataRoot",
      appDataRoot,
    ];
    let result = await getArgs(args, logger);
    assert.equal(result.appDataRoot, appDataRoot);
  });

  test.it("Should resolve package.json from package name", async () => {
    const config = await getArgs(["@swizzyweb/swerve"], logger);
    assert(config.services["@swizzyweb/swerve"].packageJson);
    assert.equal(
      config.services["@swizzyweb/swerve"].packageJson.name,
      "@swizzyweb/swerve",
    );
  });

  test.it("Should resolve package.json from absolute path", async () => {
    const config = await getArgs([path.join(__dirname, "..")], logger);
    assert(config.services["@swizzyweb/swerve"].packageJson);
    assert.equal(
      config.services["@swizzyweb/swerve"].packageJson.name,
      "@swizzyweb/swerve",
    );
  });
  test.it("Should not throw with no args", async () => {
    const config = await getArgs([], logger);
    assert(config.services["@swizzyweb/swerve"].packageJson);
    assert.equal(
      config.services["@swizzyweb/swerve"].packageJson.name,
      "@swizzyweb/swerve",
    );
  });
  test.it("Should work with no port", async () => {
    const configPath = path.join(__dirname, "./config/serviceConfig.json");
    const args = [
      "/path/to/package/",
      "run.js",
      "--appDataRoot",
      ".",
      "--someCustomArg",
      "JasonIsTheBest",
      "--someNumberINeed",
      "1000",
    ];
    let result = await getArgs(args, logger);
    const service = result.services["my-first-web-service1"];
    assert.equal(result.port, 3005);
    assert.equal(result.appDataRoot, path.join(__dirname, ".."));
    assert.equal(result.appDataRoot, path.join(__dirname, ".."));
    assert.equal(result.serviceArgs?.someCustomArg, "JasonIsTheBest");

    assert.equal(result.serviceArgs?.someNumberINeed, 1000);
  });
});
