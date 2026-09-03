import Link from "next/link";

export default function PrivacyPage() {
  return <article className="legal-page">
    <p className="eyebrow">Privacy Notice</p>
    <h1>Private by default where it matters.</h1>
    <p className="legal-updated">ManaPair uses Supabase for account/database services and Vercel for hosting.</p>
    <section><h2>Public information</h2><p>Your display name, unique username, completed tournament history, standings, and decklists from completed tournaments may be visible to other users or visitors. Your login email is not part of your public profile.</p></section>
    <section><h2>Private tournament information</h2><p>Decklists remain limited to the deck owner and tournament admins until the event is completed. Match data is limited according to tournament participation and admin permissions while the event is active.</p></section>
    <section><h2>Email contact sharing</h2><p>Your registered email is stored separately from public profile data. During an active tournament, the database may disclose it only to the opponent currently paired against you so that the two of you can arrange your match. That pairing-based access ends when the tournament is no longer active.</p></section>
    <section><h2>Security</h2><p>ManaPair uses authenticated access controls and database Row Level Security to restrict private records. No system can promise absolute security, but the service is designed so sensitive information is not readable merely by knowing another user’s ID or by directly calling the public API.</p></section>
    <section><h2>Third-party services</h2><p>Supabase processes authentication and database records, Vercel hosts the application, and Scryfall is used to validate Magic card names. ManaPair does not intentionally sell user information or use tournament contact emails for advertising.</p></section>
    <section><h2>Your choices</h2><p>Do not register for a tournament if you do not want your registered email disclosed to a paired opponent for tournament coordination. You should not submit information you are not comfortable storing as part of the tournament record.</p></section>
    <p className="legal-note">See the <Link href="/terms">Terms of Service</Link> for the rules governing use of ManaPair.</p>
  </article>;
}
