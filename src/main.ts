// @ts-ignore
import express, { Application } from "@swizzyweb/express";
import { getArgs, installWebService, SwerveArgs } from "./utils/index.js";
import { SwizzyWinstonLogger } from "@swizzyweb/swizzy-web-service";
import os from "node:os";
import process from "node:process";
import { ISwerveManager, SwerveManager } from "./swerve.js";

export async function runV2(): Promise<ISwerveManager> {
  let gLogger = new SwizzyWinstonLogger({
    port: 0,
    logLevel: process.env.LOG_LEVEL ?? "info",
    appDataRoot: ".",
    appName: `swerve`,
    ownerName: "swerve",
    hostName: os.hostname(),
    pid: process.pid,
  });

  const swerveManager: ISwerveManager = new SwerveManager({});
  try {
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
