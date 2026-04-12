
import "../home.css"

// import { marqueeData } from "../consts/cards"
import Hero from "../../components/components/hero"
import { MorrisAbout, MorrisNuggets } from "../../components/components/morris-front-sections"
import MarqueeContainer from "../../components/components/marquee-container"
import Metrics from "../../components/components/metrics"
import HowItWorks from "../../components/components/how-it-works"
import ProjectsSection from "../../components/components/projects-section"
import OpenLedger from "../../components/components/open-ledger"
import FAQSection from "../../components/components/faq-section"

export default function Home() {
  return (
    <>
      <main className="bg-[#FAFAFA] relative">
        <Hero />
        <MorrisNuggets />
        <MorrisAbout />
        <MarqueeContainer />
        {/* <Metrics /> */}
        <HowItWorks />
        <ProjectsSection />
        <OpenLedger />
        <FAQSection />
      </main>
      {/* <LearnMore cards={CARDS} /> */}
      {/* <Footer /> */}
    </>
  )
}
