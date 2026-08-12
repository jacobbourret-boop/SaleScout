import { useEffect, useState } from "react";
import { AppleLogo, EnvelopeSimple, FacebookLogo, GoogleLogo, Moon, PaperPlaneTilt, SignIn, SignOut, Sun } from "@phosphor-icons/react";
import { Brand } from "../components/brand";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Switch } from "../components/ui/switch";

const providers = [
  { id: "google", label: "Google", icon: GoogleLogo },
  { id: "apple", label: "Apple", icon: AppleLogo },
  { id: "facebook", label: "Facebook", icon: FacebookLogo }
];

export function ProfileScreen({ model }) {
  const {
    profile,
    favorites,
    theme,
    user,
    authLoading,
    pendingAction,
    setTheme,
    saveProfile,
    startAuth,
    isAuthReady,
    sendMagicLink,
    signOut,
    submitBetaFeedback
  } = model;
  const [draft, setDraft] = useState(profile);
  const [email, setEmail] = useState("");
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedback, setFeedback] = useState("");
  useEffect(() => setDraft(profile), [profile]);
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const identity = draft.displayName || draft.username || user?.email || "Local scout";

  async function submitFeedback(event) {
    event.preventDefault();
    if (!feedback.trim()) return;
    const sent = await submitBetaFeedback({ type: feedbackType, message: feedback.trim() });
    if (sent) setFeedback("");
  }

  return (
    <div className="screen page-screen profile-screen">
      <header className="screen-intro"><h1>Your scout profile</h1><p>Set up the app for your perfect Saturday.</p></header>
      <div className="profile-layout">
        <Card className="profile-identity">
          <Brand />
          <div className="profile-avatar">{String(identity).slice(0, 1).toUpperCase()}</div>
          <h2>{identity}</h2>
          <p>{user ? user.email : "Browsing as a guest"}</p>
          <span>{favorites.size} saved {favorites.size === 1 ? "sale" : "sales"}</span>
        </Card>
        <form className="profile-form" onSubmit={(event) => { event.preventDefault(); saveProfile(draft); }}>
          <section className="settings-section">
            <div className="settings-heading"><h2>About you</h2><p>This name appears with community updates.</p></div>
            <div className="profile-fields">
              <label className="field-block"><span>Display name</span><input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} maxLength={80} placeholder="Your first name" /></label>
              <label className="field-block"><span>Username</span><input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} maxLength={40} placeholder="weekend-scout" /></label>
            </div>
          </section>
          <section className="settings-section">
            <div className="settings-heading"><h2>Discovery preferences</h2><p>Used as your starting point each time.</p></div>
            <label className="setting-row"><span><strong>Default distance</strong><small>How far to look for sales</small></span><select value={draft.defaultRadius} onChange={(event) => setDraft((current) => ({ ...current, defaultRadius: event.target.value }))}><option value="2">2 miles</option><option value="5">5 miles</option><option value="10">10 miles</option><option value="25">25 miles</option></select></label>
            <label className="setting-row"><span><strong>Start on</strong><small>Your first screen after opening</small></span><select value={draft.defaultView} onChange={(event) => setDraft((current) => ({ ...current, defaultView: event.target.value }))}><option value="home">Home</option><option value="explore">Explore</option><option value="map">Map</option><option value="saved">Saved</option></select></label>
            <div className="setting-row"><span><strong>Dark mode</strong><small>Comfortable after sunset</small></span><span className="theme-switch"><Sun size={17} /><Switch checked={dark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} aria-label="Use dark mode" /><Moon size={17} /></span></div>
          </section>
          <Button type="submit" size="lg">Save preferences</Button>
        </form>
      </div>

      <section className="social-section">
        <div className="settings-heading"><h2>{user ? "You’re signed in" : "Join the private beta"}</h2><p>{user ? "Your reports are protected and tied to your tester account." : "Sign in to publish sales, add notes, and report what you find."}</p></div>
        {authLoading ? <p className="muted-copy">Checking your sign-in…</p> : user ? (
          <div className="signed-in-row"><span><strong>{user.email || "Authenticated scout"}</strong><small>Tester account active</small></span><Button type="button" variant="secondary" onClick={signOut} disabled={pendingAction === "auth:signout"}><SignOut size={18} />Sign out</Button></div>
        ) : (
          <>
            <form className="magic-link-form" onSubmit={async (event) => { event.preventDefault(); const sent = await sendMagicLink(email); if (sent) setEmail(""); }}>
              <label className="field-block"><span>Email address</span><div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /><Button type="submit" disabled={pendingAction === "auth:email"}><EnvelopeSimple size={18} />Email me a sign-in link</Button></div></label>
            </form>
            <div className="provider-grid">{providers.map((provider) => { const Icon = provider.icon; const ready = isAuthReady(provider.id); return <button key={provider.id} type="button" className={ready ? "is-ready" : ""} disabled={!ready || Boolean(pendingAction)} onClick={() => startAuth(provider.id)}><Icon size={22} weight="fill" /><span><strong>{provider.label}</strong><small>{ready ? "Continue" : "Not enabled"}</small></span><SignIn size={17} /></button>; })}</div>
          </>
        )}
      </section>

      <section className="social-section beta-feedback-section">
        <div className="settings-heading"><h2>Beta feedback</h2><p>Found a bug or have an idea? Send it directly to the SaleScout feedback inbox.</p></div>
        <form className="beta-feedback-form" onSubmit={submitFeedback}>
          <label className="field-block"><span>Feedback type</span><select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)}><option value="bug">Something is broken</option><option value="idea">Feature idea</option><option value="other">Other feedback</option></select></label>
          <label className="field-block"><span>What happened?</span><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={1200} rows={4} placeholder="Tell us what you tried, what you expected, and what happened instead." required /></label>
          <Button type="submit" variant="secondary" disabled={!feedback.trim() || !user || pendingAction === "feedback"}><PaperPlaneTilt size={18} />{user ? "Send feedback" : "Sign in to send"}</Button>
        </form>
      </section>
    </div>
  );
}
