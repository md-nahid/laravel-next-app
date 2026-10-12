declare namespace NodeJS {
  interface ProcessEnv {
    /** Public frontend URL with the same-origin API proxy path, e.g. https://app.vercel.app/backend */
    NEXT_PUBLIC_REST_API_ENDPOINT: string
  }
}
