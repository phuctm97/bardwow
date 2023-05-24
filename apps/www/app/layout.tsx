import "./layout.css";

import type { Metadata } from "next";
import type { FC, PropsWithChildren } from "react";

import { Inconsolata, Inter } from "next/font/google";

import { Configuration } from "./configuration";

export const metadata: Metadata = {
  title: "Bard Wow!",
  description:
    "Save & share Bard conversations. Discover & use Bard prompts. Enhance Bard with more features. It's free & open-source.",
};

const inconsolata = Inconsolata({
  variable: "--tw-font-inconsolata",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--tw-font-inter",
  subsets: ["latin"],
});

const Layout: FC<PropsWithChildren> = ({ children }) => (
  <html className={`${inconsolata.variable} ${inter.variable}`} lang="en">
    <body>
      <Configuration>{children}</Configuration>
    </body>
  </html>
);

export default Layout;
