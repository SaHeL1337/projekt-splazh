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
import { Layout as L, theme } from 'antd';
const { Content } = L;
import { ConfigProvider } from 'antd';
import React from 'react';

import MyFooter from './components/Footer';
import Menu from './components/Menu';
import MyHeader from './components/Header';

import { ClerkProvider } from '@clerk/react-router'

export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args);
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider
      loaderData={loaderData}
      signUpFallbackRedirectUrl="/"
      signInFallbackRedirectUrl="/"
    >
    <ConfigProvider
    theme={{
      token: {
        fontSize: 15,
      },
      algorithm: theme.defaultAlgorithm,
      components: {
        Layout: {
          headerBg: '#fff',
        }
      }
    }}>
     <L style={{height:"100vh"}}>
      <Menu/>
      <L className="layout">
        <MyHeader/>
        <Content className="content" style={{ margin: '24px 16px 0'}}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
            }}
          >
          <Outlet />
          </div>
        </Content>
        <MyFooter />
      </L>
    </L>
  </ConfigProvider>
  </ClerkProvider>
  )
}


export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="referrer" content="no-referrer" />
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
