import Link from "next/link";

export default function PrivacyPage() {
  return <article className="legal-page">
    <p className="eyebrow">Privacy Notice</p>
    <h1>Private by default where it matters.</h1>
    <p className="legal-updated">ManaPair uses Supabase for account/database services and Vercel for hosting.</p>
    <section><h2>Public information</h2><p>Your display name, custom username, completed tournament history, standings, and decklists from completed tournaments may be visible to other users or visitors. Your login email and mobile phone number are not part of your public profile.</p></section>
    <section><h2>Private deck library</h2><p>Decks saved on the Decks page are private to your account and are not part of your public profile. When you choose a saved deck to enter a tournament, ManaPair creates a separate snapshot for that tournament. Later edits or deletion of the saved library deck do not change the tournament copy.</p></section>
    <section><h2>Private tournament information</h2><p>Tournament decklists remain limited to the deck owner and tournament admins until the event is completed. After completion, the submitted tournament copy may become public as part of tournament history; the reusable deck in your private Decks library remains private. Match data is limited according to tournament participation and admin permissions while the event is active.</p></section>
    <section><h2>Matchup contact sharing</h2><p>Your registered email address and Israeli mobile phone number are stored separately from public profile data. During an active tournament, the database may disclose both only to players currently paired against you so that you can arrange your match. Pairing-based access ends when the tournament is no longer active.</p><p>Phone numbers are checked for Israeli mobile-number format: exactly 10 digits beginning with 05. ManaPair does not use SMS verification and currently does not require an email-confirmation link, so these checks do not prove ownership of either contact method.</p></section>
    <section><h2>Security</h2><p>ManaPair uses authenticated access controls and database Row Level Security to restrict private records. No system can promise absolute security, but the service is designed so sensitive information is not readable merely by knowing another user’s ID or by directly calling the public API.</p></section>
    <section><h2>Third-party services</h2><p>Supabase processes authentication, contact information, and database records, Vercel hosts the application, and Scryfall is used to validate Magic card names. ManaPair does not intentionally sell user information or use tournament contact details for advertising.</p></section>
    <section><h2>Your choices</h2><p>Do not enter a tournament if you do not want your registered email address and phone number disclosed to the players you are paired against for tournament coordination. Opponents are required by the Terms to use those details only for arranging tournament matches.</p></section>
    <p className="legal-note">See the <Link href="/terms">Terms of Service</Link> for the rules governing use of ManaPair.</p>
  </article>;
}
