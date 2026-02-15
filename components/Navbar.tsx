import {Box, Menu, X} from "lucide-react";
import Button from "./ui/Button";
import {Link, useLocation, useOutletContext} from "react-router";
import {useEffect, useMemo, useState} from "react";
import {t} from "../lib/i18n";

type NavLinkItem = {
    label: string;
    href: string;
    isActive: boolean;
};

const Navbar = () => {
    const { pathname, hash } = useLocation();
    const { isSignedIn, userName, signIn, signOut, locale, setLocale } = useOutletContext<AuthContext>()
    const copy = t[locale];
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const isHome = pathname === "/";
    const sectionHref = (id: string) => (isHome ? `#${id}` : `/#${id}`);
    const ctaHref = sectionHref("upload");
    const isSectionActive = (id: string) => {
        if (!isHome) return false;
        if (!hash) return id === "product";
        return hash === `#${id}`;
    };
    const navLinks = useMemo<NavLinkItem[]>(
        () => [
            { label: copy.navProduct, href: sectionHref("product"), isActive: isSectionActive("product") },
            { label: copy.navPricing, href: "/pricing", isActive: pathname.startsWith("/pricing") },
            { label: copy.navCommunity, href: sectionHref("community"), isActive: isSectionActive("community") },
            { label: copy.navFaq, href: sectionHref("faq"), isActive: isSectionActive("faq") },
            ...(isSignedIn ? [{ label: copy.navProjects, href: "/projects", isActive: pathname.startsWith("/projects") }] : []),
        ],
        [copy.navCommunity, copy.navFaq, copy.navPricing, copy.navProduct, copy.navProjects, pathname, isSectionActive, isSignedIn],
    );

    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    const handleAuthClick = async () => {
        if(isSignedIn) {
            try {
                await signOut();
            } catch (e) {
                console.error(`Sign out failed: ${e}`);
            }

            return;
        }

        try {
            await signIn();
        } catch (e) {
            console.error(`Sign in failed: ${e}`);
        }
    };

    return (
        <header className="navbar">
            <nav className="inner">
                <div className="left">
                    <Link to="/" className="brand">
                        <Box  className="logo" />

                        <span className="name">
                            {copy.brand}
                        </span>
                    </Link>

                    <ul className="links">
                        {navLinks.map((link) => (
                            <li key={link.href}>
                                <Link to={link.href} className={link.isActive ? "active" : ""}>
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="actions">
                    <button
                        type="button"
                        className="mobile-toggle"
                        aria-label="Toggle navigation"
                        aria-expanded={isMobileOpen}
                        onClick={() => setIsMobileOpen((prev) => !prev)}
                    >
                        {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>

                    <div className="locale-switcher" role="tablist" aria-label="Language switch">
                        <button
                            type="button"
                            className={locale === "fa" ? "active" : ""}
                            onClick={() => setLocale("fa")}
                        >
                            فارسی
                        </button>
                        <button
                            type="button"
                            className={locale === "en" ? "active" : ""}
                            onClick={() => setLocale("en")}
                        >
                            EN
                        </button>
                    </div>

                    {isSignedIn ? (
                        <>
                            <span className="greeting">
                                {userName ? `${copy.hi}، ${userName}` : copy.signedIn}
                            </span>

                            <Button size="sm" onClick={handleAuthClick} className="btn">
                                {copy.logOut}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={handleAuthClick} size="sm" variant="ghost">
                                {copy.logIn}
                            </Button>

                            <Link to={ctaHref} className="cta">{copy.getStarted}</Link>
                        </>
                    )}
                </div>
            </nav>

            <div className={`mobile-panel ${isMobileOpen ? "open" : ""}`}>
                <ul className="mobile-links">
                    {navLinks.map((link) => (
                        <li key={`mobile-${link.href}`}>
                            <Link
                                to={link.href}
                                className={link.isActive ? "active" : ""}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </header>
    )
}

export default Navbar
