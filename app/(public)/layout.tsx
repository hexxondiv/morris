import Head from "next/head";
import Header from "@/components/components/header";
import Footer from "@/components/components/footer";

interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export default function PublicLayout({
  children,
  title = "MORRIS MONYE - Community Funding & Impact Platform",
  description = "MORRIS MONYE provides a community-driven platform for funding impactful projects, supporting communities, and publishing transparent impact data.",
  keywords = "educational intervention, southeast education, student support services, professional development, learning disabilities, academic support, educational consulting, school improvement, literacy programs, STEM education",
  canonicalUrl,
  ogImage = "/og.png",
  noIndex = false,
}: PublicLayoutProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MORRIS MONYE",
    "alternateName": "MORRIS MONYE",
    "description": description,
    "url": process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    "logo": `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/logo.png`,
    "sameAs": [
      // Add your social media URLs here
      "https://instagram.com/isee",
      "https://twitter.com/isee"
    ],
    "areaServed": {
      "@type": "Place",
      "name": "South-East Nigeria"
    },
    "serviceType": [
      "Project Funding",
      "Community Support",
      "Public Transparency",
      "Impact Reporting"
    ]
  };

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="MORRIS MONYE" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta charSet="UTF-8" />
        
        {/* Canonical URL */}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        
        {/* Robot Instructions */}
        {noIndex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        )}
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content="MORRIS MONYE - community funding and impact platform" />
        <meta property="og:site_name" content="MORRIS MONYE" />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content="MORRIS MONYE - community funding and impact platform" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        
        {/* Additional SEO Meta Tags */}
        <meta name="theme-color" content="#1976d2" />
        <meta name="msapplication-TileColor" content="#1976d2" />
        <meta name="format-detection" content="telephone=no" />
      </Head>
      
      <div className="min-h-screen flex flex-col">
        <Header />
        <main role="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
