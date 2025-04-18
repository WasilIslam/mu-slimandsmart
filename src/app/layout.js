import { Inter, Amiri } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import UserMenu from "@/components/auth/UserMenu";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
});

export const metadata = {
  title: "Namaz Guide",
  description: "Your companion for daily prayers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.variable} ${amiri.variable} antialiased`} style={{
        backgroundImage: "url('/78824.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
        <AuthProvider>
          <UserMenu />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
