/// <reference types="vite/client" />

// The types of the platform's public envs (injected at build/preview time). A VITE_* is exposed in the client's bundle.
interface ImportMetaEnv {
  readonly VITE_FAB_BASE_URL?: string;
  readonly VITE_FAB_PROJECT_ID?: string;
  /** "1" on a preview build: App.tsx reports the console to the Studio only then. */
  readonly VITE_FAB_PREVIEW?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// The imports the ALLOWED build plugins add (see fab-plugins.json). Declared here, not through each package's own
// types, so an app that has not declared the plugin still type-checks; the import itself fails at build without it.
declare module "*.svg?react" {
  import type { FC, SVGProps } from "react";
  const Component: FC<SVGProps<SVGSVGElement>>;
  export default Component;
}
declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXContent: ComponentType<Record<string, unknown>>;
  export default MDXContent;
}
declare module "*.glsl" { const source: string; export default source; }
declare module "*.vert" { const source: string; export default source; }
declare module "*.frag" { const source: string; export default source; }
