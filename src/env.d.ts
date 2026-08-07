import type { Runtime } from "@astrojs/cloudflare";

// Minimal shape of the R2 binding actually used by src/lib/r2-proxy.ts.
type R2Bucket = {
  get(key: string): Promise<{
    body: ReadableStream;
    size: number;
    httpEtag: string;
    writeHttpMetadata(headers: Headers): void;
  } | null>;
};

type CloudflareEnv = {
  LISTMONK_URL: string;
  LISTMONK_LIST_UUID: string;
  LISTMONK_LIST_ID: string;
  LISTMONK_WELCOME_TEMPLATE_ID: string;
  LISTMONK_FROM_EMAIL: string;
  LISTMONK_TX_API_USER: string;
  LISTMONK_TX_API_TOKEN: string;
  // Shared "websites-images" R2 bucket; see src/lib/r2-proxy.ts.
  IMAGES_BUCKET: R2Bucket;
};

declare global {
  namespace App {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging requires an empty extends body
    interface Locals extends Runtime<CloudflareEnv> {}
  }
}

export {};
