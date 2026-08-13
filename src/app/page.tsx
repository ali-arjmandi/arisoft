import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Highlights } from "@/components/Highlights";
import { Process } from "@/components/Process";
import { Services } from "@/components/Services";
import { Approach } from "@/components/Approach";
import { ToolsStrip } from "@/components/ToolsStrip";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Highlights />
        <Process />
        <Services />
        <Approach />
        <ToolsStrip />
        <Pricing />
        <FAQ />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
