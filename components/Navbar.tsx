import {Box} from "lucide-react";
import Button from "./ui/Button";
import {useLocation, useOutletContext} from "react-router";
import {t} from "../lib/i18n";

const Navbar = () => {
    const { pathname } = useLocation();
    const { isSignedIn, userName, signIn, signOut, locale, setLocale } = useOutletContext<AuthContext>()
    const copy = t[locale];
    const sectionHref = (id: string) => (pathname === "/" ? `#${id}` : `/#${id}`);
    const ctaHref = sectionHref("upload");

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
                    <div className="brand">
                        <Box  className="logo" />

                        <span className="name">
                            {copy.brand}
                        </span>
                    </div>

                    <ul className="links">
                        <a href={sectionHref("product")}>{copy.navProduct}</a>
                        <a href={sectionHref("pricing")}>{copy.navPricing}</a>
                        <a href={sectionHref("community")}>{copy.navCommunity}</a>
                    </ul>
                </div>

                <div className="actions">
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
        </header>
    )
}

export default Navbar
