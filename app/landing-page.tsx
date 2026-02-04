"use client";

import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import ShowcaseSection from "@/components/showcase-section";
import ProductivitySection from "@/components/productivity-section";
import Footer from "@/components/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Navbar />

      <div className="bg-[#fafafa]">
        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <FeaturesSection />
      </div>

      {/* Showcase Section */}
      <ShowcaseSection />

      {/* Productivity Section */}
      <ProductivitySection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
