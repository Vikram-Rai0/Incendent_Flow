import { redirect } from "next/navigation";

// "/" has no content of its own: send people to the dashboard.
// The dashboard layout sends anyone who is not signed in on to /login.
export default function Home() {
  redirect("/dashboard");
}
