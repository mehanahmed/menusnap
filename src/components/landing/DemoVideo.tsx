"use client";

import { DEMO_TOUR_VIDEO_URL, DEMO_WORKFLOW } from "@/lib/data";
import { Button, Container, SectionHeading } from "@/components/landing/ui";
import { Reveal } from "@/components/landing/Reveal";
import { ArrowRightIcon } from "@/components/landing/icons";
import { ProductDemoLaptop } from "./product-demo-laptop";

export function DemoVideo() {
  return (
    <section id="demo" className="relative overflow-hidden bg-night text-white">
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgb(255 90 54 / 0.18), transparent)" }}
        aria-hidden="true"
      />

      <Container className="section-pad relative">
        <SectionHeading
          dark
          eyebrow="See MenuSnap in Action"
          title="Research থেকে Ready Menu — দেখুন কীভাবে।"
          description="Two minutes is all you need to understand how MenuSnap turns scattered research into an organized, buildable menu."
        />

        {/* Video Walkthrough Mockup with Desktop / Mobile Switcher */}
        <div className="mt-8 sm:mt-12">
          <ProductDemoLaptop
            videoUrl={DEMO_TOUR_VIDEO_URL}
            mobileVideoUrl="/videos/demo%20mobile%20version.MOV"
            poster="https://i.pinimg.com/videos/thumbnails/originals/79/86/b7/7986b72a3da0ea79fcd1c5c482eefecf.0000000.jpg"
            title="MenuSnap Interactive Menu Intelligence"
            mobileTitle="MenuSnap Mobile Experience"
            badge="Desktop View"
            mobileBadge="Mobile View"
          />
        </div>

        {/* Workflow */}
        <Reveal className="mt-10">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3" aria-label="MenuSnap workflow">
            {DEMO_WORKFLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={
                    i === DEMO_WORKFLOW.length - 1
                      ? "rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-bold text-white"
                      : "rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-white/80"
                  }
                >
                  {step}
                </span>
                {i < DEMO_WORKFLOW.length - 1 && (
                  <ArrowRightIcon className="h-3.5 w-3.5 text-white/30" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="mt-10 flex justify-center">
          <Button href="#pricing" size="lg" withArrow>
            Start Building My Menu
          </Button>
        </div>
      </Container>
    </section>
  );
}