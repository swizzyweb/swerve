// @ts-ignore
import express, { Request, Response } from "@swizzyweb/express";
import {
  BrowserLogger,
  getPackageJsonFromDirectory,
  ILogger,
} from "@swizzyweb/swizzy-common";
import { SwizzyWinstonLogger } from "@swizzyweb/swizzy-web-service";
import { readFileSync } from "fs";
import path from "path";
import os from "node:os";
import process from "node:process";
import { getServiceNameFromCurrentDirPackage } from "./getArgs";
import { mkdirSync } from "node:fs";

export async function installWebService(
  appName: string,
  importPathOrName: string,
  port: number,
  expressApp: any,
  serviceArgs: any,
  gLogger: ILogger<any>,
) {
  const packageName = importPathOrName;

  try {
    gLogger.info(
      `Getting webservice package ${packageName} and will run on port ${port}`,
    );

    gLogger.debug(`Getting tool with path: ${importPathOrName}`);

    const fullPath = await getFullImportPath(importPathOrName);
    const tool = await import(fullPath); //require(fullPath); //require(packageName as string);

    gLogger.debug(`Got service with require: ${JSON.stringify(tool)}`);
    gLogger.debug(`Getting web service from tool...`);

    const appDataPath = path.join(serviceArgs.appDataRoot, "appdata", appName);
    mkdirSync(appDataPath, { recursive: true });

    const logger = getLoggerForService(
      serviceArgs,
      serviceArgs.appName,
      port,
      gLogger,
    );
    gLogger.debug(`serviceArgs for ${packageName}: ${serviceArgs}`);
    const service = await tool.getWebservice({
      appDataPath,
      ...serviceArgs,
      port,
      app: expressApp,
      packageName,
      serviceArgs: { ...serviceArgs },
      logger,
    });

    logger.debug(`Got web service`);

    gLogger.debug(`Installing web service...`);
    await service.install({});

    gLogger.debug(`Installed web service ${packageName}`);
    return service;
  } catch (e) {
    const exceptionMessage = `exception: ${e}
Failed to install web service, is it installed with NPM? Check package exists in node_modules
    To add, run:
			npm install ${packageName ?? "packageName"}
		args:
			packageName: ${packageName}
			port: ${port}
`;
    //		${getHelpText}`;
    gLogger.error(`Failed to install web service`);
    throw e; //new Error(exceptionMessage);
  }
}

export async function getFullImportPath(
  importPathOrName: string,
): Promise<string> {
  const importPath = importPathOrName.startsWith(".")
    ? path.join(process.cwd(), importPathOrName)
    : importPathOrName;
  let fullPath;
  if (importPathOrName === importPath) {
    fullPath = await require.resolve(importPath, {
      paths: [process.cwd()],
    });
  } else {
    fullPath = importPath;
  }

  return fullPath;
}

export function getLoggerForService(
  serviceArgs: any,
  appName: string,
  port: number,
  gLogger: ILogger<any>,
) {
  const logLevel = serviceArgs.logLevel ?? gLogger.getLoggerProps().logLevel;
  const logFileName = serviceArgs.logFileName ?? undefined;
  const ownerName = appName;
  const pid = process.pid;
  const hostName = os.hostname();
  const logDir = serviceArgs.logDir;
  const appDataRoot = serviceArgs.appDataRoot;

  return gLogger.clone({
    port,
    appName,
    appDataRoot,
    logDir,
    hostName,
    pid,
    logLevel,
    ownerName,
    logFileName,
  });
}
