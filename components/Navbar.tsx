import {Box, Menu, X} from "lucide-react";
import Button from "./ui/Button";
import {useLocation, useOutletContext} from "react-router";
import {useEffect, useMemo, useState} from "react";
import {t} from "../lib/i18n";

const Navbar = () => {
    const { pathname } = useLocation();
    const { isSignedIn, userName, signIn, signOut, locale, setLocale } = useOutletContext<AuthContext>()
    const copy = t[locale];
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const sectionHref = (id: string) => (pathname === "/" ? `#${id}` : `/#${id}`);
    const ctaHref = sectionHref("upload");
    const navLinks = useMemo(
        () => [
            { label: copy.navProduct, href: sectionHref("product"), isActive: pathname === "/" },
            { label: copy.navPricing, href: sectionHref("pricing"), isActive: pathname === "/" },
            { label: copy.navCommunity, href: sectionHref("community"), isActive: pathname === "/" },
            ...(isSignedIn ? [{ label: copy.navProjects, href: "/projects", isActive: pathname.startsWith("/projects") }] : []),
        ],
        [copy.navCommunity, copy.navPricing, copy.navProduct, copy.navProjects, isSignedIn, pathname],
    );

    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    const handleAuthClick = async () => {
        if(isSignedIn) {
            try {
                await signOut();
            } catch (e) {
                console.error(`Puter sign out failed: ${e}`);
            }

            return;
        }

        try {
            await signIn();
        } catch (e) {
            console.error(`Puter sign in failed: ${e}`);
        }
    };

    return (
        <header className="navbar">
            <nav className="inner">
                <div className="left">
                    <a href="/" className="brand">
                        <Box  className="logo" />

                        <span className="name">
                            {copy.brand}
                        </span>
                    </a>

                    <ul className="links">
                        {navLinks.map((link) => (
                            <a key={link.href} href={link.href} className={link.isActive ? "active" : ""}>
                                {link.label}
                            </a>
                        ))}
                    </ul>
                </div>

                <div className="actions">
                    <button
                        type="button"
                        className="mobile-toggle"
                        aria-label="Toggle navigation"
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

                            <a href={ctaHref} className="cta">{copy.getStarted}</a>
                        </>
                    )}
                </div>
            </nav>

            <div className={`mobile-panel ${isMobileOpen ? "open" : ""}`}>
                <div className="mobile-links">
                    {navLinks.map((link) => (
                        <a
                            key={`mobile-${link.href}`}
                            href={link.href}
                            className={link.isActive ? "active" : ""}
                            onClick={() => setIsMobileOpen(false)}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            </div>
        </header>
    )
}

export default Navbar
