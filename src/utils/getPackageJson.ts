import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

/**
 * Determines whether the input string is a relative or absolute path.
 */
function isPath(input: string): boolean {
  return input.startsWith(".") || path.isAbsolute(input);
}

/**
 * Resolves the package.json file for a given package name or path.
 * @param packageNameOrPath Package name (e.g., 'lodash', '@nestjs/core') or path (e.g., './node_modules/lodash')
 * @returns Parsed package.json content or null
 */
export function getPackageJson(
  packageNameOrPath: string,
): { packageJson: Record<string, any>; servicePath: string } | null {
  try {
    // Step 1: Resolve to an absolute path
    //    const resolvedEntry = isPath(packageNameOrPath)
    //    ? require.resolve(path.resolve(packageNameOrPath))
    //      : //      : require.resolve(packageNameOrPath);
    //        require.resolve(packageNameOrPath, { paths: [process.cwd()] });
    const resolvedEntry = isPath(packageNameOrPath)
      ? pathToFileURL(path.resolve(packageNameOrPath)).href
      : import.meta.resolve(packageNameOrPath);

    // Step 2: Traverse upward to find the nearest package.json
    let dir = fileURLToPath(resolvedEntry); //path.dirname(resolvedEntry);
    console.log(dir);
    while (dir !== path.parse(dir).root) {
      const pkgPath = path.join(dir, "package.json");
      if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, "utf-8");
        const packageJson = JSON.parse(content);
        if (!dir || dir === ".") {
          dir = process.cwd();
        } else if (dir.startsWith(".")) {
          dir = path.join(process.cwd(), dir);
        }
        console.log(dir);
        const entrypoint = path.join(dir, packageJson.main);
        console.log(entrypoint);
        console.error(`Entrypoint is ${entrypoint}`);
        //        throw `Entrypoint is ${entrypoint}`;
        return { packageJson, servicePath: entrypoint };
      }
      dir = path.dirname(dir);
    }

    throw new Error(`Could not parse package.json`);
  } catch (err) {
    throw new Error(
      `Could not resolve package.json for "${packageNameOrPath}"`,
    );
  }
}
/**
 * Get the nearest package.json of a given import name.
 * @param packageName The name of the imported package (e.g. "lodash")
 */
export function getPackageJsonOrig(
  packageName: string,
): Record<string, any> | null {
  try {
    // Resolve the entry file of the package
    const entryPath = import.meta.resolve(packageName); //require.resolve(packageName);

    // Traverse up from the resolved file to find package.json
    let dir = path.dirname(entryPath);

    while (dir !== path.parse(dir).root) {
      const pkgPath = path.join(dir, "package.json");

      if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, "utf8");
        return { packageJson: JSON.parse(content), servicePath: dir };
      }

      dir = path.dirname(dir);
    }

    return null;
  } catch (error) {
    //console.error(`Failed to resolve package "${packageName}":`, error);
    return null;
  }
}
