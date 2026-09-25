export const routeConfig = {
  login: {
    icon: "",
    url: "/",
  },
  register: {
    icon: "",
    url: "/register",
  },
  dashboard: {
    icon: "",
    url: "/dashboard",
  },
  chat: {
    icon: "",
    url: (id: string) => `/dashboard/${id}`,
  },
}
