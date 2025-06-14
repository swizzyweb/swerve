// @ts-ignore
import express, { Request, Response } from "@swizzyweb/express";
import { getPackageJsonFromDirectory, ILogger } from "@swizzyweb/swizzy-common";
import { readFileSync } from "fs";
import path from "path";
import process from "node:process";
import { IConfig, IService, KeyValue } from "../config/config";
import { SwerveConfigParser } from "../config/config-parser";
import { deepMerge } from "@swizzyweb/swizzy-common";
import { getPackageJson } from "./getPackageJson";

function getHelpText() {
  return `Help --
npm run server <serviceName> <port (optional)>
		`;
}

export function getServiceNameFromCurrentDirPackage(logger: ILogger<any>) {
  try {
    return process.cwd();
  } catch (e) {
    logger.debug(`Error getting package from current dir package.json ${e}`);
    throw e;
  }
}

function getAppDataRoot(
  appDataRootPath: string | undefined,
  logger: ILogger<any>,
) {
  try {
    let directory;
    if (!appDataRootPath || appDataRootPath === ".") {
      directory = getServiceNameFromCurrentDirPackage(logger);
    } else {
      directory = appDataRootPath;
    }
    return directory;
  } catch (e) {
    throw {
      message: `Unable to get app data root ${appDataRootPath}`,
      exception: e,
    };
  }
}

function getService(serviceName: string | undefined, logger: ILogger<any>) {
  try {
    let directory;
    let packageJson;
    if (!serviceName || serviceName === ".") {
      directory = getServiceNameFromCurrentDirPackage(logger);
      packageJson = getPackageJsonFromDirectory(directory);
    } else if (serviceName && serviceName.startsWith(".")) {
      directory = serviceName;
      const jsonPath = path.join(directory);
      packageJson = getPackageJsonFromDirectory(path.resolve(jsonPath));
    } else {
      return getPackageJson(serviceName);
    }

    const response = {
      servicePath: directory,
      packageJson,
    };
    logger.debug(`response ${response}`);
    return response;
  } catch (e) {
    const ex = {
      message: "Error getting service name",
      serviceName,
      error: e,
    };
    throw ex;
  }
}

export interface SwerveArgs extends IConfig {
  services: KeyValue<IService>;
  port: number;
  appDataRoot?: string;
  serviceArgs?: KeyValue<any>;
  logLevel: string;
  [key: string]: any;
}

function getDefaultArgs(): SwerveArgs {
  let currentServiceName = undefined;

  return {
    logLevel: "info",
    services: {},
    port: 3005,
    serviceArgs: {},
  };
}
const ARG_PREFIX = "--";
const CONFIG_ARG_KEY = "config";

function cliArgToPropertyName(rawArg: string): string {
  return rawArg.replace(ARG_PREFIX, "");
}

const configParser = new SwerveConfigParser();

async function getConfigValuesFromPath(
  configPath: string,
  logger: ILogger<any>,
) {
  try {
    return await configParser.parse(configPath);
  } catch (e: any) {
    logger.error(`Error occurred parsing config values from path`);
    throw {
      message:
        "Unexpected error occurred when attempting to read serviceConfiguration file",
      configFilePath: configPath,
      error: e,
    };
  }
}
const topLevelArgs = new Set();
topLevelArgs.add("port");
function isTopLevelArg(key: string) {
  return topLevelArgs.has(key);
}

function tryParseNumberArg(val): number | boolean {
  try {
    return parseInt(val);
  } catch (e) {
    return false;
  }
}

function parseArgValue(val: string, logger: ILogger<any>) {
  try {
    return JSON.parse(val);
  } catch (e) {
    logger.warn(
      `Exception occurred while parsing arg value ${val}. This is sometimes expected. Error ${e}`,
    );
  }

  return val;
}

const DEFAULT_PORT = 3005;
export async function getArgs(
  args: string[],
  logger: ILogger<any>,
): Promise<SwerveArgs> {
  let argKey = undefined;
  let swerveArgs = getDefaultArgs();
  let configFromFile: IConfig;
  const serviceCounts = new Map<string, number>();
  for (let i = 2; i < args.length; i++) {
    const nextVal = args[i];
    if (argKey) {
      if (argKey == CONFIG_ARG_KEY) {
        if (configFromFile) {
          throw new Error(
            `Config file already specified, you can only specify one config file with the --config arg`,
          );
        }
        configFromFile = await getConfigValuesFromPath(nextVal, logger);
        argKey = undefined;
        continue;
      }
      swerveArgs.serviceArgs[argKey] = parseArgValue(nextVal, logger);
      argKey = undefined;
      continue;
    }
    if (nextVal.startsWith(ARG_PREFIX)) {
      argKey = cliArgToPropertyName(nextVal);
      continue;
    }

    const serviceDetails = getService(nextVal, logger);
    const serviceName = serviceDetails.packageJson.name;
    const serviceIndex = serviceCounts.get(serviceName) ?? 0;
    serviceCounts.set(serviceName, serviceIndex + 1);
    swerveArgs.services[`${serviceDetails.packageJson.name}-${serviceIndex}`] =
      {
        serviceConfiguration: {},
        ...serviceDetails,
      };
  }

  swerveArgs.port =
    configFromFile?.port ?? swerveArgs.serviceArgs?.port ?? DEFAULT_PORT;

  logger.debug(`configFromFile ${configFromFile}`);
  if (configFromFile?.services) {
    logger.debug(`ConfigFromFile has service`);
    for (const serviceEntry of Object.entries(configFromFile.services)) {
      const { servicePath } = serviceEntry[1];
      if (!servicePath) {
        throw new Error(
          `ServicePath must either be a package name or path to a local package`,
        );
      }
      const serviceDetails = getService(servicePath, logger);
      const serviceName = path.join(
        serviceDetails.packageJson.name!,
        serviceEntry[0],
      );
      logger.debug(`ServiceName: ${serviceName}`);
      swerveArgs.services[serviceEntry[0]] = await deepMerge(
        await deepMerge(
          swerveArgs.serviceArgs ?? {},
          serviceEntry.values() ?? {},
        ),
        configFromFile.services[serviceEntry[0]],
      );
    }
  }
  swerveArgs = deepMerge(swerveArgs, configFromFile ?? {});
  logger.debug(`${JSON.stringify(swerveArgs)}`);

  if (
    swerveArgs.serviceArgs?.appDataRoot?.startsWith(".") ||
    swerveArgs.serviceArgs?.appDataRoot == undefined
  ) {
    const appDataRootPath = path.join(
      process.cwd(),
      //      Object.values(swerveArgs.services)[0].servicePath,
    );

    swerveArgs.appDataRoot = appDataRootPath;
    swerveArgs.serviceArgs.appDataRoot = appDataRootPath;
  } else {
    swerveArgs.appDataRoot = swerveArgs.serviceArgs.appDataRoot;
  }

  if (Object.keys(swerveArgs.services).length < 1) {
    logger.info(`swerveArgs.services.length < 1`);
    const { servicePath, packageJson } = getService(".", logger);
    swerveArgs.services[packageJson.name] = {
      servicePath,
      packageJson,
      appDataRoot: swerveArgs.appDataRoot,
      ...swerveArgs.serviceArgs,
    };
  }
  return swerveArgs;
}
