import type { Runtime } from "@astrojs/cloudflare";

type CloudflareEnv = {
  LISTMONK_URL: string;
  LISTMONK_LIST_UUID: string;
  LISTMONK_LIST_ID: string;
  LISTMONK_WELCOME_TEMPLATE_ID: string;
  LISTMONK_FROM_EMAIL: string;
  LISTMONK_TX_API_USER: string;
  LISTMONK_TX_API_TOKEN: string;
};

declare global {
  namespace App {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging requires an empty extends body
    interface Locals extends Runtime<CloudflareEnv> {}
  }
}

export {};
