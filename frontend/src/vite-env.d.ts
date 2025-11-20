/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_QUEST_BADGES_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}