import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";

function AppContent({ Component, pageProps }: AppProps) {
  const { theme } = useUser();
  const isLight = theme === "light";
  return (
    <div className={`min-h-screen ${isLight ? "bg-white text-black" : "bg-black text-white"}`}>
      <title>Your-Tube Clone</title>
      <Header />
      <Toaster />
      <div className="flex">
        <Sidebar />
        <Component {...pageProps} />
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </UserProvider>
  );
}
