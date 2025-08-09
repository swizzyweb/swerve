#!/usr/bin/env deno

import cluster from "node:cluster";
import http from "node:http";
import os from "node:os";
import { run } from "./main.js";
import process from "node:process";
import { BrowserLogger } from "@swizzyweb/swizzy-common";
import { getArgs } from "./utils/index.js";

async function exec() {
  const args = await getArgs(process.argv, new BrowserLogger());

  const numThreads = args.serviceArgs?.numThreads ?? os.availableParallelism();
  if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    console.log(`forking ${numThreads} threads`);
    // Fork workers.
    for (let i = 0; i < numThreads; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server
    /*  http
    .createServer((req, res) => {
      res.writeHead(200);
      res.end("hello world\n");
    })
    .listen(8000);*/
    run();
    console.log(`Worker ${process.pid} started`);
  }
}
exec();
