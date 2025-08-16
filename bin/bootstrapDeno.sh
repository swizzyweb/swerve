#!/usr/bin/env bash
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
deno run $DENO_ARGS $SCRIPT_DIR/bootstrapDeno.js "$@"
