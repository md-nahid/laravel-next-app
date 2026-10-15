declare namespace NodeJS {
  interface ProcessEnv {
    /** NestJS API URL, e.g. http://localhost:3001/api */
    NEXT_PUBLIC_REST_API_ENDPOINT: string
  }
}
