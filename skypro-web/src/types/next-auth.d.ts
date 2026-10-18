import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      status?: string;
      impersonatedBy?: number;
      impersonatorRole?: "admin";
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    impersonatedBy?: number;
    impersonatorRole?: "admin";
  }
}
