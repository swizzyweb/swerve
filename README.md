# swerve

swizzy-swerve is a bootstrapper for swizzy web services. This package will bootstrap and run
independent swizzy web services.

## Getting started

### Install with npm

```
npm install --registry=https://npm.swizzyweb.com @swizzyweb/swerve
```

### Sample Apps

#### Frontend template

https://github.com/swizzyweb/swizzy-frontend-template-web-service

#### Backend template

https://github.com/swizzyweb/swizzy-backend-template-web-service

### Supported commands

swerve: synonym for swerven

swerven: swerve with nodejs

swerveb: swerve with bun

swerved: swerve with deno

swervenc: swerve with node clustered

swervebc: swerve with bun clustered

swervedc: swervice with deno clustered.

## Usage:

npm run server <packageName> <port (optional>

## Or install globally:

npm install -g .

## Uninstall

npm uninstall -g @swizzyweb/swerve

## Command

swerve <packageNames>

Swerve can run multiple packages on the same port using a single command.
Just provide multiple package names space separated.

## run

```
swerve <service> [seriveB serivceC...] [options]

```

## run clustered

```
swervec <service> [--numThreads (optional)] [options]
```

Note: cluster commands end with c

#### options

```

--port : (default 3005) port value to run service
--appDataRoot - (default project root) path to where appdata root directory will be placed, stores logs and service data
--numThreads - (default num cpu's reported by os) (cluster only) number of threads to use in the cluster
--<argKey> - Any additional key passed will be a serviceArg passed to all services
```

#### ie

```

swerve some-service-name --port=3000

```

##

### No args

This will run the project in the current working directory

```

swerve

```

### Current dir with port

This will run the server in the current directory with the specified port

```

swerve .

```

#### with port:

```

swerve . --port 3000

```

### Run single file

```

swerve /path/to/file.js

```

#### ie:

```

swerve /absolute/path/to/app.js

```

or

```

swerve $(pwd)/dist/app.js

```

## Additional runtimes

We support bun deno and nodejs for runtimes

```

swerven # node
swerveb # bun
swerved # deno (Requires deno to be installed globally)
DENO_ARGS="--allow-sys" swerved # deno with permissions args
swerven # default (points to swerven as of 0.2.4)

```

## cluster

to run a cluster of your swerve services, you can use the cluster scripts. These are implemented in nodejs, bun, and deno.

### default cluster

```

swervec

```

### nodejs cluster

```

swerven

```

### bun cluster

```

swervebc

```

### deno

```

servedc

```

### What's passed to getWebservice in web service package

```
{
packageName: string,
port: number,
app: expressApp,
logger: ILogger,
appDataPath: "/appDataRoot/appdata/serviceName/"
...serviceArgs // Anything else (from service config or swerve command args)
}
```

## Service Configurations

```
{
  "port": 3000, // Global port
  "logLevel": "info",
  "noLogFile": false,
  "services": {
    "friendlyLocalServiceName": {
      "port": 3001, // Optional port override
      "servicePath": ".", // if building package in current directory
      "myArg1": "AnythingYouWant" // Custom serviceArg
    },
    "friendlyImportServiceName": {
      "port": 3002,
      "servicePath": "@swizzyweb/dyn-serve-web-service" // running installed web service package
    },
    "friendlyNeighborServiceName": {
      "port": 3002,
      "servicePath": "../my-friendly-neighbor-web-service",
      "authCode": "SomeAuthCode"
    }
  }
}
```

## ENV variables

INIT_LOG_LEVEL - log level for init process.
WITH_LOG_FILE - Whether to write init logs to file.

### Running

```
swerve --config my-web-service-config.json
```

# Breaking Changes
