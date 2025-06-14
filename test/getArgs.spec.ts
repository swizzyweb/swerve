import { SwizzyWinstonLogger } from "@swizzyweb/swizzy-web-service";
import { getArgs } from "../src/utils";
import path from "node:path/posix";

const logger = new SwizzyWinstonLogger({
  port: 80,
  appName: `AppName`,
  appDataRoot: "./log/test-log.json",
  hostName: "HOSTNAME",
  pid: process.pid,
});

describe("getArgs", () => {
  it("Sets port and custom arg", async () => {
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
    expect(result.port).toEqual(80);
    expect(result.serviceArgs?.someCustomArg).toEqual("JasonIsTheBest");
  });

  it("sets appDataRoot", async () => {
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
    expect(result.port).toEqual(80);
    expect(result.serviceArgs?.someCustomArg).toEqual("JasonIsTheBest");
  });

  it("Throws on invalid config file path", async () => {
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
      expect(e).toEqual({
        message:
          "Unexpected error occurred when attempting to read serviceConfiguration file",
        configFilePath: configPath,
        error: expect.anything(),
      });
    }
  });
  it("Should read config values from config", async () => {
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
    expect(result.port).toEqual(3000);
    const service = result.services["my-first-web-service1"];
    expect(result.serviceArgs?.someCustomArg).toEqual("JasonIsTheBest");

    expect(service.someOtherArgFromConfig).toEqual("ThisIsTheArgValue");
    expect(service.shouldTimeout).toEqual(true);
    expect(service.nestedJson).toEqual({
      hello: "world",
      none: false,
    });
  });

  it("Should override parameters in order of args, config file last", async () => {
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
    expect(service.someOtherArgFromConfig).toEqual("ThisIsTheArgValue");

    expect(result.port).toEqual(3000);
    expect(result.serviceArgs?.someCustomArg).toEqual("JasonIsTheBest");

    expect(result.serviceArgs?.someNumberINeed).toEqual(1000);
    expect(service.shouldTimeout).toEqual(true);
    expect(service.nestedJson).toEqual({
      hello: "world",
      none: false,
    });
  });

  it("Should override parameters in order of args, config file first", async () => {
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
    expect(service.someOtherArgFromConfig).toEqual("ThisIsTheArgValue");
    expect(result.port).toEqual(3000);
    expect(result.appDataRoot).toEqual(path.join(__dirname, ".."));
    expect(result.appDataRoot).toEqual(path.join(__dirname, ".."));
    expect(result.serviceArgs?.someCustomArg).toEqual("JasonIsTheBest");

    expect(result.serviceArgs?.someNumberINeed).toEqual(1000);
    expect(service.shouldTimeout).toEqual(true);
    expect(service.nestedJson).toEqual({
      hello: "world",
      none: false,
    });
  });

  it("Should getService from args", async () => {
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
    expect(result.port).toEqual(80);

    const service = result.services["my-first-web-service1"];
    //    expect(result.serviceArgs.appDataRoot).toEqual(".");
    expect(result.serviceArgs?.someCustomArg).toEqual("JasonIsTheBest");
  });

  it("Should set appDataRoot to current package root by default", async () => {
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
    expect(service.someOtherArgFromConfig).toEqual("ThisIsTheArgValue");
    expect(result.port).toEqual(3000);
    expect(result.appDataRoot).toEqual(path.join(__dirname, ".."));
    expect(result.serviceArgs?.someCustomArg!).toEqual("JasonIsTheBest");

    expect(result.serviceArgs?.someNumberINeed!).toEqual(1000);
    expect(service.shouldTimeout).toEqual(true);
    expect(service.nestedJson).toEqual({
      hello: "world",
      none: false,
    });
  });
  it("Should create multiple services", async () => {
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
    expect(result.port).toEqual(91);
    expect(result.appDataRoot).toEqual(path.join(__dirname, ".."));
    //   expect(service.someCustomArg).toEqual("JasonIsTheBest");

    //    expect(service.someNumberINeed).toEqual(1000);
    //    expect(service.shouldTimeout).toEqual(true);
    //    expect(service.nestedJson).toEqual({
    //      hello: "world",
    //      none: false,
    //    });
    //    expect(result.services.length).toEqual(2);
  });
  it("Should create absolute path appdata directory", async () => {
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
    expect(result.appDataRoot).toEqual(appDataRoot);
  });

  it("Should resolve package.json from package name", async () => {
    const config = await getArgs(["@swizzyweb/swerve"], logger);
    expect(config.services["@swizzyweb/swerve"].packageJson).toBeDefined();
    expect(config.services["@swizzyweb/swerve"].packageJson.name).toEqual(
      "@swizzyweb/swerve",
    );
  });

  it("Should resolve package.json from absolute path", async () => {
    const config = await getArgs([path.join(__dirname, "..")], logger);
    expect(config.services["@swizzyweb/swerve"].packageJson).toBeDefined();
    expect(config.services["@swizzyweb/swerve"].packageJson.name).toEqual(
      "@swizzyweb/swerve",
    );
  });
  it("Should not throw with no args", async () => {
    const config = await getArgs([], logger);
    expect(config.services["@swizzyweb/swerve"].packageJson).toBeDefined();
    expect(config.services["@swizzyweb/swerve"].packageJson.name).toEqual(
      "@swizzyweb/swerve",
    );
  });
  it("Should work with no port", async () => {
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
    expect(result.port).toEqual(3005);
    expect(result.appDataRoot).toEqual(path.join(__dirname, ".."));
    expect(result.appDataRoot).toEqual(path.join(__dirname, ".."));
    expect(result.serviceArgs?.someCustomArg).toEqual("JasonIsTheBest");

    expect(result.serviceArgs?.someNumberINeed).toEqual(1000);
  });
});
