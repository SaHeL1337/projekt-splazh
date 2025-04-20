import {
  isRouteErrorResponse,
  Links,
  Meta,
  Navigate,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import { rootAuthLoader } from '@clerk/react-router/ssr.server'
import '@fontsource/roboto/400.css';
import type { Route } from "./+types/root";
import "./app.css";
import { Layout as L, theme, Typography, Result, Button } from 'antd';
const { Content } = L;
import { ConfigProvider } from 'antd';
import React from 'react';

import MyFooter from './components/Footer';
import Menu from './components/Menu';
import MyHeader from './components/Header';

import { ClerkProvider, SignedIn, SignedOut } from '@clerk/react-router'

export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args);
}

// Layout wrapper component that conditionally renders different layouts
function AppLayout() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  // If we're on the landing page, just render the Outlet directly
  // The landing page has its own self-contained layout
  if (isLandingPage) {
    return <Outlet />;
  }

  // For authenticated routes, use the app's internal layout
  return (
    <>
    <SignedIn>
    <L style={{ minHeight: "100vh" }}>
      <Menu/>
      <L className="layout">
        <MyHeader/>
        <Content 
          className="content" 
          style={{ 
            padding: '24px',
            backgroundColor: '#f5f7fa'
          }}
        >
          <div
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              width: '100%'
            }}
          >
            <Outlet />
          </div>
        </Content>
        <MyFooter />
      </L>
    </L>
    </SignedIn>
    <SignedOut>
      <Navigate to="/" />
    </SignedOut>
    </>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider
      loaderData={loaderData}
      signUpFallbackRedirectUrl="/projects"
      signInFallbackRedirectUrl="/projects"
    >
    <ConfigProvider
    theme={{
      token: {
        fontSize: 15,
        colorPrimary: '#1890ff',
        borderRadius: 6,
        wireframe: false
      },
      algorithm: theme.defaultAlgorithm,
      components: {
        Layout: {
          headerBg: '#fff',
          bodyBg: '#f5f7fa',
          headerPadding: '0 24px',
        },
        Menu: {
          itemHeight: 48,
          itemHoverBg: 'rgba(24, 144, 255, 0.1)',
          itemSelectedBg: 'rgba(24, 144, 255, 0.1)',
          itemSelectedColor: '#1890ff',
        },
        Card: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          borderRadius: 8,
        },
        Button: {
          borderRadius: 6,
          paddingInline: 16,
        },
        Table: {
          borderRadius: 8,
          headerBg: '#fafafa',
        },
        Select: {
          optionSelectedBg: 'rgba(24, 144, 255, 0.1)',
          borderRadius: 6,
        },
        Input: {
          borderRadius: 6,
        },
        Tag: {
          borderRadius: 4,
        }
      }
    }}>
      <AppLayout />
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
    <ConfigProvider>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f5f7fa' 
      }}>
        <Result
          status={isRouteErrorResponse(error) && error.status === 404 ? "404" : "error"}
          title={message}
          subTitle={details}
          extra={
            <Button type="primary" onClick={() => window.location.href = "/"}>
              Back Home
            </Button>
          }
        />
        {stack && (
          <div style={{ 
            maxWidth: '800px',
            margin: '24px auto',
            background: '#fff',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'auto'
          }}>
            <Typography.Title level={5}>Error Details</Typography.Title>
            <pre style={{ 
              background: '#f9f9f9',
              padding: '16px',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              <code>{stack}</code>
            </pre>
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}
