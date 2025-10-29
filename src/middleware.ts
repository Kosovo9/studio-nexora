import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["es","en","pt","fr","it","de","nl","sv","no","da","ja","ko"],
  defaultLocale: "es"
});

export const config = {matcher: ["/((?!_next|.*\\..*).*)"]};