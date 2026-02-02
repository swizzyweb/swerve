#!/usr/bin/env node

import cluster from "node:cluster";
import http from "node:http";
import os from "node:os";
import { run } from "./main.js";
import process from "node:process";
import { BrowserLogger } from "@swizzyweb/swizzy-common";
import { SwizzyWinstonLogger } from "@swizzyweb/swizzy-web-service";
import { getArgs } from "@swizzyweb/swerve-manager";

/**
 * extra arg:
 * numThreads - number, default to num cpu cores from os
 * */
async function runCluster() {
  const args = await getArgs(process.argv, new BrowserLogger());
  const logger = new SwizzyWinstonLogger({
    port: args.port,
    //    appDataRoot: args.appDataRoot,
    appName: `swerve-root`,
    hostName: os.hostname(),
    pid: process.pid,
  });
  const numThreads = args.serviceArgs?.numThreads ?? os.availableParallelism();
  if (cluster.isPrimary) {
    logger.info(`[ParentThread]: Primary ${process.pid} is running`);
    logger.info(`[ParentThread]: forking ${numThreads} threads`);
    // Fork workers.
    for (let i = 0; i < numThreads; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      logger.info(
        `[ParentThread]: worker ${worker.process.pid} died with code ${code} and singal ${signal}`,
      );
    });
  } else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server

    run();
    console.log(`Worker ${process.pid} started`);
  }
}
