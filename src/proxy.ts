import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

let cachedClerkMiddleware: NextMiddleware | null = null;

function getClerkMiddleware(): NextMiddleware {
  if (!cachedClerkMiddleware) {
    cachedClerkMiddleware = clerkMiddleware();
  }
  return cachedClerkMiddleware;
}

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Attaches Clerk session context across routes while leaving public resident portals (/r/*),
 * digital receipts (/receipt/*), landing (/landing), and the demo workspace open.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (
    !process.env.CLERK_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    return NextResponse.next();
  }
  return getClerkMiddleware()(request, event);
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
