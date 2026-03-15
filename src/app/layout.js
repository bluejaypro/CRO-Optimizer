import "./globals.css";

export const metadata = {
  title: "ClarityPro | Organic CRO Analytics",
  description: "Track organic visitors and conversion rates using Microsoft Clarity and Claude AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
