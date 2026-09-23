declare namespace NodeJS {
  interface ProcessEnv {
    /** Laravel app origin, e.g. https://api.example.com (no trailing slash) */
    NEXT_PUBLIC_REST_API_ENDPOINT: string
  }
}
