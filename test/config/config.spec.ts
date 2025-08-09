import { IConfig } from "../../dist/config/config.js";

describe(`Config tests`, () => {
  it("Should accept service configuration", () => {
    const config: IConfig = {
      port: 3005,
      services: {
        dynserve: {
          packageName: "@swizzyweb/dyn-serve-web-service",

          serviceConfiguration: {
            myVar: "thisisit",
            butThis: {
              echo: ["isNumber", 1],
            },
          },
        },
      },
    };

    // Noop, fails if model changed
  });
});
