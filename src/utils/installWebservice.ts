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
export async function installWebService(
  appName: string,
  importPathOrName: string,
  port: number,
  expressApp: any,
  serviceArgs: any,
  gLogger: ILogger<any>,
) {
  const packageName = importPathOrName;
  // Probably use type of express app

  serviceArgs.appDataRoot;
  const logger = gLogger.clone({
    port,
    appName,
    appDataRoot: serviceArgs.appDataRoot,
    hostName: os.hostname(),
    pid: process.pid,
  });
  try {
    logger.info(
      `Getting webservice package ${packageName} and will run on port ${port}`,
    );
    logger.debug(`Getting tool with path: ${importPathOrName}`);

    const fullPath = require.resolve(importPathOrName, {
      paths: [process.cwd()],
    });
    const tool = await require(fullPath); //require(packageName as string);
    logger.debug(`Got service with require`);
    logger.debug(JSON.stringify(tool));

    logger.debug(`Getting web service from tool...`);
    const service = await tool.getWebservice({
      app: expressApp,
      packageName,
      serviceArgs: { ...serviceArgs },
      logger,
    });
    logger.debug(`Got web service`);
    logger.debug(`Installing web service...`);
    await service.install({});
    logger.debug(`Installed web service ${packageName}`);
    return service;
  } catch (e) {
    const exceptionMessage = `Failed to install web service, is it installed with NPM? Check package exists in node_modules
		To add, run:
			npm install ${packageName ?? "packageName"}
		args:
			packageName: ${packageName}
			port: ${port}
		exception: ${e}`;
    //		${getHelpText}`;
    logger.error(`Failed to install web service`);
    throw e; //new Error(exceptionMessage);
  }
}
