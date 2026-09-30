import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { hash, verify } from "argon2";
import { prisma } from "../db/client";

export const auth = betterAuth({
  appName: "NynetyDegrees",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => hash(password, { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      verify: ({ hash: hashedPassword, password }) => verify(hashedPassword, password),
    },
  },
  user: { additionalFields: { role: { type: "string", required: true, defaultValue: "USER", input: false } } },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12 },
  advanced: {
    database: { generateId: "uuid" },
    useSecureCookies: process.env.NODE_ENV === "production" || process.env.APP_URL?.startsWith("https://"),
    cookiePrefix: "nynety",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" || process.env.APP_URL?.startsWith("https://"), path: "/" },
  },
  rateLimit: { enabled: true, window: 60, max: 10, customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 } } },
});
