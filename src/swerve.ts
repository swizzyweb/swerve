// @ts-ignore
import express, { Application } from "@swizzyweb/express";
import {
  getFullImportPath,
  getLoggerForService,
  installWebService,
  SwerveArgs,
} from "./utils";
import { SwizzyWinstonLogger, WebService } from "@swizzyweb/swizzy-web-service";
import os from "node:os";
import process from "node:process";
import { ILogger } from "@swizzyweb/swizzy-common";
import path from "path";
import { mkdirSync } from "node:fs";

export interface ISwerveManager {
  run(request: RunRequest): Promise<RunResponse>;
}

export interface RunRequest {
  args?: SwerveArgs;
}

export interface RunResponse {}

export interface SwerveManagerProps {}

export class SwerveManager implements ISwerveManager {
  apps: { [key: number]: Application };
  webServices: WebService<any>[];
  constructor(props: SwerveManagerProps) {
    this.apps = {};
    this.webServices = [];
  }

  async run(request: RunRequest): Promise<RunResponse> {
    const { args } = request;
    const newWebServices = await this.runWithArgs({
      args,
    });
    this.webServices.push(...newWebServices);
    return {};
  }

  async runWithArgs(request: RunRequest) {
    const { args } = request;
    const logLevel: string =
      process.env.LOG_LEVEL ?? args.serviceArgs.logLevel ?? "info";
    let gLogger = new SwizzyWinstonLogger({
      port: 0,
      logLevel,
      appDataRoot: args.appDataRoot ?? ".",
      appName: `swerve`,
      hostName: os.hostname(),
      ownerName: "swerve",
      pid: process.pid,
    });

    try {
      const webServices: WebService<any>[] = [];
      const newApps: { [port: number]: Application } = {};
      for (const serviceEntry of Object.entries(args.services)) {
        const port = serviceEntry[1].port ?? args.port;
        if (!this.apps[port]) {
          this.apps[port] = await express();
          newApps[port] = this.apps[port];
        }

        const app = this.apps[port];

        const service = serviceEntry[1];
        const packageName = serviceEntry[0];
        const importPathOrName = service.servicePath ?? service.packageName;
        gLogger.debug(`importPathOrName ${importPathOrName}`);
        const webservice = await this.installWebService({
          serviceKey: serviceEntry[0],
          packageName,
          importPathOrName,
          port,
          app,
          appDataRoot: args.appDataRoot,
          serviceArgs: {
            ...service,
            ...service.serviceConfiguration,
            ...args.serviceArgs,
          },
          gLogger,
        });

        webServices.push(webservice);
      }

      for (const newAppEntry of Object.entries(newApps)) {
        const [port, newApp] = newAppEntry;
        await newApp.listen(port, () => {
          gLogger.debug(`New app listening on port ${port}`);
        });
      }

      for (const webService of webServices) {
        gLogger.info(`${webService.name} running on port ${webService.port}`);
      }
      return webServices;
    } catch (e) {
      gLogger.error(
        `Error occurred initializing service\n ${e.message}\n ${e.stack ?? {}}`,
      );
    }
  }

  private async runWithApp(props: RunWithAppArgs) {
    const { app, args } = props;
    let gLogger = new SwizzyWinstonLogger({
      port: 0,
      logLevel: process.env.LOG_LEVEL ?? "info",
      appDataRoot: args.appDataRoot,
      appName: `swerve`,
      hostName: os.hostname(),
      pid: process.pid,
    });

    try {
      gLogger = new SwizzyWinstonLogger({
        logLevel: args.serviceArgs.logLevel ?? process.env.LOG_LEVEL ?? "info",
        port: args.port,
        logDir: args.appDataRoot,
        appName: `swerve`,
        hostName: os.hostname(),
        pid: process.pid,
      });

      gLogger.debug(`Swerve Args: ${JSON.stringify(args)}`);

      const PORT = args.port ?? 3005;
      const webServices = [];
      for (const serviceEntry of Object.entries(args.services)) {
        const service = serviceEntry[1];
        const packageName = service.packageName;
        const importPathOrName =
          service.servicePath ?? service.serviceArgs.srvicePath ?? packageName;
        const webservice = await this.installWebService({
          serviceKey: serviceEntry[0],
          packageName,
          importPathOrName,
          port: PORT,
          app,
          appDataRoot: args.appDataRoot,
          serviceArgs: {
            ...service,
            ...service.serviceConfiguration,
            ...args.serviceArgs,
          },
          gLogger,
        });
        webServices.push(webservice);
      }
      return webServices;
    } catch (e) {
      gLogger.error(
        `Error occurred initializing service\n ${e.message}\n ${e.stack ?? {}}`,
      );
    }
  }

  async installWebService(props: {
    //
    serviceKey: string;
    importPathOrName: string;
    app: Application;
    appDataRoot: string;
    packageName: string;
    port: number;
    gLogger: ILogger<any>;
    serviceArgs: { [key: string]: any };
  }) {
    //  const packageName = importPathOrName;
    const {
      app,
      appDataRoot,
      packageName,
      port,
      gLogger,
      serviceArgs,
      importPathOrName,
      serviceKey,
    } = props;

    try {
      gLogger.info(
        `Getting webservice package ${packageName} and will run on port ${port}`,
      );

      gLogger.debug(`Getting tool with path: ${importPathOrName}`);

      const fullPath = await getFullImportPath(importPathOrName);
      const tool = await import(fullPath); //require(fullPath); //require(packageName as string);

      gLogger.debug(`Got service with require: ${JSON.stringify(tool)}`);
      gLogger.debug(`Getting web service from tool...`);

      const appDataPath = path.join(appDataRoot, "appdata", serviceKey);
      mkdirSync(appDataPath, { recursive: true });

      const logger = getLoggerForService(
        serviceArgs,
        serviceKey,
        port,
        gLogger,
      );
      gLogger.debug(`serviceArgs for ${packageName}: ${serviceArgs}`);
      const service = await tool.getWebservice({
        appDataPath,
        ...serviceArgs,
        port,
        app,
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
}

interface RunWithAppArgs {
  app: Application;
  args: SwerveArgs;
}
