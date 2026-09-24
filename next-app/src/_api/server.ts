import "server-only"
import { headers } from "next/headers"
import { axios } from "./api"
import { _queryKeys } from "./client"

export async function getCurrentUser() {
  return axios
    .get(_queryKeys.me, {
      headers: Object.fromEntries(await headers()),
    })
    .then((res) => {
      return res.data
    })
    .catch(() => {
      return
    })
}
