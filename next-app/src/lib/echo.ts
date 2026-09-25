"use client"

import Echo from "laravel-echo"
import Pusher from "pusher-js"
import { axios } from "@/_api/api"

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

const apiEndpoint = process.env.NEXT_PUBLIC_REST_API_ENDPOINT ?? ""
const apiOrigin = apiEndpoint.replace(/\/api\/?$/, "")

const echo =
  typeof window === "undefined"
    ? null
    : (() => {
        window.Pusher = Pusher

        return new Echo({
          broadcaster: "reverb",
          key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
          wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
          wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT),
          wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT),
          forceTLS: false,
          enabledTransports: ["ws", "wss"],
          authorizer: (channel) => ({
            authorize: (socketId, callback) => {
              axios
                .post(`${apiOrigin}/broadcasting/auth`, {
                  socket_id: socketId,
                  channel_name: channel.name,
                })
                .then((response) => callback(null, response.data))
                .catch((error) => callback(error, null))
            },
          }),
        })
      })()

export { echo }
