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
import {SITE_NAME, SITE_URL} from "../lib/constants";

const LOCALE_INIT_KEY = "2d2three_locale_initialized";

export function meta({}: Route.MetaArgs) {
    const title = `${SITE_NAME} | تبدیل پلان دو بعدی به نمای سه بعدی با هوش مصنوعی`;
    const description = "2d2three ابزار فارسی تبدیل پلان 2D به نمای 3D است. مناسب معماران، طراحان داخلی و تیم های ساختمانی ایران.";
    const ogImage = `${SITE_URL}/og-image.svg`;

    return [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" },
        { name: "theme-color", content: "#c86a3b" },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "fa_IR" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: SITE_URL },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
    ];
}

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
  { rel: "alternate", hrefLang: "fa-IR", href: SITE_URL },
  { rel: "alternate", hrefLang: "en", href: SITE_URL },
  { rel: "alternate", hrefLang: "x-default", href: SITE_URL },
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

        const initialized = window.localStorage.getItem(LOCALE_INIT_KEY) === "1";

        if (!initialized) {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE);
            window.localStorage.setItem(LOCALE_INIT_KEY, "1");
            setAuthState((prev) => ({ ...prev, locale: DEFAULT_LOCALE }));
            return;
        }

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

    useEffect(() => {
        if (typeof document === "undefined") return;
        const isRTLDocument = authState.locale === "fa";
        document.documentElement.lang = authState.locale;
        document.documentElement.dir = isRTLDocument ? "rtl" : "ltr";
    }, [authState.locale]);

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
