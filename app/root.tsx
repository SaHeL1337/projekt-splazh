import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { rootAuthLoader } from '@clerk/react-router/ssr.server'
import '@fontsource/roboto/400.css';
import type { Route } from "./+types/root";
import "./app.css";
import Search from "./components/Button";

import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/react-router'
 
export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args)
}


export default function App({ loaderData }: Route.ComponentProps) {
  return (
    
    <ClerkProvider 
      loaderData={loaderData}
      signUpFallbackRedirectUrl="/"
      signInFallbackRedirectUrl="/"
    >
      <header className="flex items-center justify-center py-8 px-4">
        
      
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <main>
      <Search /> 
        <Outlet />
      </main>
    </ClerkProvider>
  )
}


export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
