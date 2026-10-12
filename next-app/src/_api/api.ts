import Axios, { type AxiosError } from "axios"

const axiosConfig = {
  timeout: 50_000,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  withXSRFToken: true,
}

function onError(error: AxiosError) {
  switch (error.response?.status) {
    case 419:
    case 401: {
      if (typeof window === "undefined") {
        break
      }
      window.location.href = "/"
      break
    }
    case 403:
      // window.location.href = "/unauthorized";
      break
  }
  return Promise.reject(error)
}

export const axios = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_REST_API_ENDPOINT,
  ...axiosConfig,
})

const apiBaseUrl = process.env.NEXT_PUBLIC_REST_API_ENDPOINT.replace(
  /\/api\/?$/,
  ""
)
export const fetcher = Axios.create({
  baseURL: apiBaseUrl,
  ...axiosConfig,
})

axios.interceptors.response.use(
  function onFulfilled(response) {
    return response
  },
  function onRejected(error) {
    return onError(error)
  }
)
fetcher.interceptors.response.use(
  function onFulfilled(response) {
    return response
  },
  function onRejected(error) {
    return onError(error)
  }
)
