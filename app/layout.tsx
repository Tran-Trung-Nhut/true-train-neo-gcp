import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import {
  FIREBASE_CONFIG_GLOBAL,
  readFirebaseWebConfigFromEnv,
  serializeConfigForScript,
} from "@/lib/firebase/config";
import "./globals.css";

// Rendered per request so the Firebase config below is read at runtime rather
// than frozen into the container image at build time.
export const dynamic = "force-dynamic";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRUETRAINNEO — IELTS Vocabulary",
  description:
    "TRUETRAINNEO — an AI-powered IELTS vocabulary app: add words in context, SM-2 flashcards, AI quizzes, chat, speaking practice and study streaks.",
  applicationName: "TRUETRAINNEO",
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "TRUETRAINNEO — IELTS Vocabulary",
    description:
      "Learn IELTS vocabulary with spaced-repetition flashcards, AI quizzes, chat, speaking practice and study streaks.",
    siteName: "TRUETRAINNEO",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f8fc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public identifiers only — never a secret. The payload is escaped by
  // serializeConfigForScript so a value cannot break out of the script tag.
  const firebaseConfig = serializeConfigForScript(readFirebaseWebConfigFromEnv());

  return (
    <html lang="en">
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.${FIREBASE_CONFIG_GLOBAL}=${firebaseConfig};`,
          }}
        />
      </head>
      <body
        className={`${grotesk.variable} ${inter.variable} ${mono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
