interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_UPDATED_DATE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
