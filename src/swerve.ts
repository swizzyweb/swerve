// @ts-ignore
import express, { Application } from "@swizzyweb/express";
import {
  getFullImportPath,
  getLoggerForService,
  installWebService,
  SwerveArgs,
} from "./utils";
import {
  AnyServer,
  IWebService,
  SwizzyWinstonLogger,
  WebService,
} from "@swizzyweb/swizzy-web-service";
import os from "node:os";
import process from "node:process";
import { ILogger } from "@swizzyweb/swizzy-common";
import path from "path";
import { mkdirSync } from "node:fs";

export interface ISwerveManager {
  run(request: RunRequest): Promise<RunResponse>;
  stop(request: StopRequest): Promise<void>;
  getRunningWebServices(
    props: GetRunningWebServiceRequest,
  ): Promise<GetRunningWebServiceResponse>;
}
export interface GetRunningWebServiceRequest {}

export interface GetRunningWebServiceResponse {
  webServices: {
    [instanceId: string]: {
      webService: any;
      serviceConfig: any;
    };
  };
}
export enum InstanceType {
  webservice = "webservice",
  stack = "stack",
}

export interface InstanceDetails {
  instanceType: InstanceType;
  instanceId: string;
}

export interface StopRequest {
  instanceDetails: InstanceDetails;
}

export interface RunRequest {
  args?: SwerveArgs;
}

export interface RunResponse {
  webServices: WebService<any>[];
}

export type Apps = {
  [key: number]: {
    app: Application;
    server?: AnyServer;
    services: {
      [instanceId: string]: {
        webService: IWebService;
        serviceArgs: SwerveArgs;
        runRequest: RunRequest;
      };
    };
  };
};

export interface SwerveManagerProps {
  apps?: Apps;
  webServices?: WebService<any>[];
}

export interface WebServiceConfiguration {}

type WebServiceConfigurations = {
  [instanceId: string]: WebServiceConfiguration;
};

export class SwerveManager implements ISwerveManager {
  apps: Apps;
  webServices: WebService<any>[];
  configurations: WebServiceConfigurations;
  constructor(props: SwerveManagerProps) {
    this.apps = props.apps ?? {};
    this.webServices = props.webServices ?? [];
  }

  async run(request: RunRequest): Promise<RunResponse> {
    const { args } = request;
    const newWebServices = await this.runWithArgs({
      args,
    });
    this.webServices.push(...newWebServices);
    return { webServices: newWebServices };
  }

  async runWithArgs(request: RunRequest) {
    const { args } = request;
    const logLevel: string = process.env.LOG_LEVEL ?? args.logLevel ?? "info";
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
        if (!this.apps[`${port}`]) {
          this.apps[`${port}`] = { app: await express(), services: {} };
          newApps[`${port}`] = this.apps[`${port}`];
        }

        const app = this.apps[`${port}`].app;

        const service = serviceEntry[1];
        const packageName = serviceEntry[0];
        const importPathOrName = service.servicePath ?? service.packageName;
        gLogger.debug(`importPathOrName ${importPathOrName}`);
        const serviceArgs: SwerveArgs = {
          ...service,
          ...service.serviceConfiguration,
          ...args.serviceArgs,
        };

        const webservice = await this.installWebService({
          serviceKey: serviceEntry[0],
          packageName,
          importPathOrName,
          port,
          app,
          appDataRoot: args.appDataRoot,
          serviceArgs,
          gLogger,
        });

        this.apps[`${port}`].services[webservice.instanceId] = {
          webService: webservice,
          serviceArgs,
          runRequest: request,
        };
        webServices.push(webservice);
      }

      for (const newAppEntry of Object.entries(newApps)) {
        const [port, appRecord] = newAppEntry;
        const newApp = appRecord.app;
        const server = await newApp.listen(port, () => {
          //          this.apps[port].services[newApp.instanceId] = {};
          gLogger.debug(`New app listening on port ${port}`);
        });
        this.apps[`${port}`].server = server;
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

  async stop(request: StopRequest) {
    const { instanceDetails } = request;
    const { instanceId, instanceType } = instanceDetails;
    const instanceIds = [];
    if (!instanceId) {
      throw new Error(`Instance id required to stop web service`);
    }
    if (instanceType === InstanceType.webservice) {
      //      console.log(`Matched instance type`);
      instanceIds.push(`${instanceId}`);
    } else if (instanceType === InstanceType.stack) {
      // TODO: implement
      throw new Error(`Stack instance type is not yet supported`);
    } else {
      //     this.logger.error(`Invalid instance details ${instanceDetails}`);
      throw new Error(`Invalid instance details provided`);
    }
    //    console.log(`instanceIds: ${instanceIds}`);
    const webServices = this.webServices.filter((service) => {
      //      console.log(`instanceId ${service.instanceId}`);
      return instanceIds.includes(`${service.instanceId}`);
    });

    if (!webServices || webServices.length < 1) {
      //console.error(webServices); //this.webServices);
      throw new Error(
        `WebService with instanceId ${instanceId} not found while attempting to stop`,
      );
    }

    const ports = [];
    for (const webService of webServices) {
      const port = webService.port;
      ports.push(port);
      //console.log(webService);
      webService.uninstall({});
      const indexes = this.webServices
        .map((val, index, array) => {
          //console.log(
          //            `instanceInSwerve: ${val.instanceId} instanceInWebService ${webService.instanceId}`,
          //          );
          if (val.instanceId == webService.instanceId) {
            return index;
          }
        })
        .filter((val) => val);
      if (indexes.length > 1) {
        throw new Error(
          `Found multiple indexes for webservice instance ${webService.instanceId}`,
        );
      } else if (indexes.length == 0) {
        throw new Error(
          `No indexes for webservice instance ${webService.instanceId}`,
        );
      }
      const index = indexes[0];
      this.webServices.splice(index, 1);
      if (!this.apps[`${port}`]?.services[webService.instanceId]) {
        //console.log(`Apps does not contain service`);
        // TODO: DO SOMETHING, log, throw maybe.
      } else {
        delete this.apps[`${port}`].services[webService.instanceId];
      }
    }

    //cleanup apps if no more services

    for (const port of ports) {
      const { services, server, app } = this.apps[`${port}`];
      if (!services || Object.keys(services).length == 0) {
        if (server) {
          server.close();
        } else {
          continue;
          // TODO: do something, log throw etc
        }
        delete this.apps[`${port}`];
      }
    }
  }

  async getRunningWebServices(
    props: GetRunningWebServiceRequest,
  ): Promise<GetRunningWebServiceResponse> {
    const webservices = {};
    for (const webservice of this.webServices) {
      const instanceId = webservice.instanceId;
      const { runRequest, serviceArgs } =
        this.apps[webservice.port].services[instanceId];
      webservices[instanceId] = {
        webService: webservice.toJson(),
        serviceConfig: runRequest?.args,
      };
    }

    return {
      webServices: webservices,
    };
  }
}

interface RunWithAppArgs {
  app: Application;
  args: SwerveArgs;
}
