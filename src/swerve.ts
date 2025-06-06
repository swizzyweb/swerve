// @ts-ignore
import express, { Application } from "@swizzyweb/express";
import { getArgs, installWebService, SwerveArgs } from "./utils";
import { SwizzyWinstonLogger, WebService } from "@swizzyweb/swizzy-web-service";
import os from "node:os";
import process from "node:process";

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
      appDataRoot: ".",
      appName: `swerve`,
      hostName: os.hostname(),
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
        const packageName = service.packageName;
        const importPathOrName = service.servicePath;
        const webservice = await installWebService(
          packageName,
          importPathOrName,
          port,
          app,
          {
            ...args.serviceArgs,
            appDataRoot: args.appDataRoot,
            ...service,
            ...service.serviceConfiguration,
            port,
          },
          gLogger.clone({
            appName: service.packageName,
            logLevel: service.logLevel ?? logLevel,
          }),
        );
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

  async runWithApp(props: RunWithAppArgs) {
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
        const importPathOrName = service.servicePath;
        const webservice = await installWebService(
          packageName,
          importPathOrName,
          PORT,
          app,
          {
            appDataRoot: args.appDataRoot,
            ...service,
            ...service.serviceConfiguration,
            ...args.serviceArgs,
          },
          gLogger,
        );
        webServices.push(webservice);
      }
      return webServices;
    } catch (e) {
      gLogger.error(
        `Error occurred initializing service\n ${e.message}\n ${e.stack ?? {}}`,
      );
    }
  }
}

/*export async function run() {
  let gLogger = new SwizzyWinstonLogger({
    port: 0,
    logLevel: process.env.LOG_LEVEL ?? "info",
    appDataRoot: ".",
    appName: `swerve`,
    hostName: os.hostname(),
    pid: process.pid,
  });

  try {
    const args = await getArgs(process.argv, gLogger);

    const app = express();
    const webServices = await runWithApp({ app, args });
    const port = args.serviceArgs.port ?? 3005;
    gLogger.debug(`Starting express app...`);
    await app.listen(port, (err) => {
      if (err) {
        gLogger.log(err);
      }
      gLogger.info(
        `${webServices
          .map((service) => {
            return service.name;
          })
          .join(",")} running on port ${port}`,
      );
    });
  } catch (e) {
    gLogger.error(
      `Error occurred initializing service\n ${e.message}\n ${e.stack ?? {}}`,
    );
  }
}*/

interface RunWithAppArgs {
  app: Application;
  args: SwerveArgs;
}
