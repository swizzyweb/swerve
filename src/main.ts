import { Application } from "express";
import {
  getArgs,
  installWebService,
  SwerveArgs,
  ISwerveManager,
  SwerveManager,
} from "@swizzyweb/swerve-manager";
import { SwizzyWinstonLogger } from "@swizzyweb/swizzy-common";
import os from "node:os";
import process from "node:process";

export async function runV2(): Promise<ISwerveManager> {
  let gLogger;
  const initLogLevel = process.env.INIT_LOG_LEVEL ?? "info";
  const withLogFile = process.env.WITH_LOG_FILE ?? false;
  const swerveManager: ISwerveManager = new SwerveManager({});
  try {
    gLogger = new SwizzyWinstonLogger({
      port: 0,
      logLevel: initLogLevel,
      appDataRoot: ".",
      appName: `swerve`,
      ownerName: "swerve",
      hostName: os.hostname(),
      pid: process.pid,
      noLogFile: !withLogFile,
    });
    const args = await getArgs(process.argv, gLogger);
    await swerveManager.run({ args });
    return swerveManager;
  } catch (e) {
    gLogger.error(`Exception running v2 ${e}`);
    throw e;
  }
}
export async function run() {
  if (true) {
    return await runV2();
  }
}

interface RunWithAppArgs {
  app: Application;
  args: SwerveArgs;
}

export async function runWithApp(props: RunWithAppArgs) {
  const { app, args } = props;
  let gLogger = new SwizzyWinstonLogger({
    port: 0,
    logLevel: process.env.LOG_LEVEL ?? "info",
    appDataRoot: args.appDataRoot,
    appName: `swerve`,
    hostName: os.hostname(),
    pid: process.pid,
    noLogFile: args.noLogFile,
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
