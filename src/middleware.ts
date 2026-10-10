import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|images|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};
