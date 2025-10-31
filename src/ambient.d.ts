// This file is for ambient type declarations.
// It's used to tell TypeScript about modules that are not part of the main
// compilation unit, but will be available at runtime.

/**
 * Declares the shape of the Vite manifest file.
 * This allows us to import `../../frontend/dist/manifest.json` without TypeScript errors,
 * even though the file only exists after the frontend has been built.
 */
declare module "*manifest.json" {
  const manifest: {
    [key: string]: {
      file: string;
      css?: string[];
      isEntry?: boolean;
      src?: string;
    };
  };
  export default manifest;
}

/**
 * Declares the shape of the server entry module from the frontend build.
 * This allows us to import `../../frontend/dist/server/entry-server.js` without TypeScript errors.
 * It specifies that the module has a `render` function with a specific signature.
 */
declare module "*/entry-server.js" {
  export function render(opts: { url: string }): Promise<{ html: string }>;
}
