import type { Metadata } from "next";
import "./globals.css";
import Nav from "../components/Nav";
import { AuthProvider } from "../lib/auth-context";

export const metadata: Metadata = {
  title: "FindMyRoomie | Find your right fit",
  description: "A compatibility-first roommate matching platform for students and working professionals.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
