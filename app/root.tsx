import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import {useEffect, useState} from "react";
import {
    getCurrentUser,
    signIn as puterSignIn,
    signOut as puterSignOut,
} from "../lib/puter.action";
import {DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY} from "../lib/i18n";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
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

const DEFAULT_AUTH_STATE: AuthState = {
    isSignedIn: false,
    userName: null,
    userId: null,
    locale: DEFAULT_LOCALE,
}

export default function App() {
    const [authState, setAuthState] = useState<AuthState>(DEFAULT_AUTH_STATE);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
        if (isLocale(savedLocale)) {
            setAuthState((prev) => ({ ...prev, locale: savedLocale }));
        }
    }, []);

    const refreshAuth = async () => {
        try {
            const user = await getCurrentUser();

            setAuthState((prev) => ({
                ...prev,
                isSignedIn: !!user,
                userName: user?.username || null,
                userId: user?.uuid || null,
            }));

            return !!user;
        } catch {
            setAuthState((prev) => ({ ...DEFAULT_AUTH_STATE, locale: prev.locale }));
            return false;
        }
    }

    useEffect(() => {
        refreshAuth()
    }, []);

    const signIn = async () => {
        await puterSignIn();
        return await refreshAuth();
    }

    const signOut = async () => {
        puterSignOut();
        return await refreshAuth();
    }

    const setLocale = (locale: Locale) => {
        setAuthState((prev) => ({ ...prev, locale }));
        if (typeof window !== "undefined") {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        }
    };

    const isRTL = authState.locale === "fa";
    const languageLabel = isRTL ? "فارسی" : "English";

  return (
      <main
          className={`app-shell min-h-screen bg-background text-foreground relative z-10 ${isRTL ? "is-fa" : "is-en"}`}
          dir={isRTL ? "rtl" : "ltr"}
          lang={authState.locale}
      >
        <Outlet
            context={{ ...authState, isRTL, languageLabel, refreshAuth, signIn, signOut, setLocale }}
        />
      </main>
  )
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
