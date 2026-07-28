import sysgrafix from "./sysgrafix.service";

const AuthService = {
  login: (data: object | undefined, token?: string) =>
    sysgrafix.post("/login/token", data || {}, {
      headers: token ? { Authorization: "Bearer " + token } : {},
    }),
};

export default AuthService;
