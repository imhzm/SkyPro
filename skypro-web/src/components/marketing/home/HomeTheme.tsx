import { MessageCircle } from "lucide-react";
import { EmailNoticeBanner } from "../EmailNoticeBanner";
import { homeOffer } from "@/data/home-theme";
import { HomeHeader } from "./HomeHeader";
import { Hero } from "./Hero";
import {
  Platforms,
  Features,
  Steps,
  UseCases,
  Pricing,
  Faq,
} from "./HomeSections";
import { HomeFooter } from "./HomeFooter";
import styles from "./home.module.css";
export function HomeTheme() {
  return (
    <main className={styles.home}>
      <EmailNoticeBanner />
      <HomeHeader />
      <Hero />
      <Platforms />
      <Features />
      <Steps />
      <UseCases />
      <Pricing />
      <Faq />
      <HomeFooter />
      <a
        className={styles.whatsappFloat}
        href={homeOffer.whatsapp}
        aria-label="تواصل مع Sky Pro عبر واتساب"
      >
        <MessageCircle size={25} />
      </a>
    </main>
  );
}
