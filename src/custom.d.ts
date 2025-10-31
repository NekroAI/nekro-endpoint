declare module "*.html" {
  const content: string;
  export default content;
}

declare module "*vite/manifest.json" {
  const manifest: {
    [key: string]: {
      file: string;
      css?: string[];
      isEntry?: boolean;
    };
  };
  export default manifest;
}

declare module "../frontend/dist/manifest.json" {
  const manifest: {
    [key: string]: {
      file: string;
      css?: string[];
      isEntry?: boolean;
    };
  };
  export default manifest;
}

declare module "../frontend/dist/index.html" {
  const content: string;
  export default content;
}
