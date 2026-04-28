import { ArrowRight } from "lucide-react";

interface DevicesShowcaseProps {
  /**
   * Click handler for the "Start writing today" CTA. The home page wires this
   * to the same `openCreateBook` handler used by the other landing CTAs —
   * opens the auth modal for unauthenticated users, or the create-book
   * dialog for signed-in users.
   */
  onCtaClick: () => void;
}

const TAGS = ["Cloud sync", "Real-time saving", "Cross-device"] as const;

export function DevicesShowcase({ onCtaClick }: DevicesShowcaseProps) {
  return (
    <section
      aria-labelledby="devices-showcase-heading"
      className="bg-gradient-to-b from-white to-[#fafafa] border-b border-[#f0f0f0] px-6 pt-12 sm:pt-16 pb-12 sm:pb-16"
    >
      <div className="max-w-6xl mx-auto text-center">
        {/* Eyebrow */}
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#888] mb-5">
          Built for every screen
        </p>

        {/* Heading */}
        <h2
          id="devices-showcase-heading"
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#111] tracking-[-0.03em] leading-[1.05] mb-6"
        >
          Write anywhere.
          <br />
          Your story comes with you.
        </h2>

        {/* Sub-heading */}
        <p className="text-base sm:text-lg text-[#555] leading-relaxed max-w-2xl mx-auto mb-14 sm:mb-16">
          Whether you're at your desk or on your iPad in a coffee shop, Plotzy
          follows you. With cloud sync, real-time saving, and a writing
          experience tailored to each device.
        </p>

        {/* Devices image — full bleed up to ~1100px wide, centered */}
        <div className="mb-12 sm:mb-14">
          <img
            src="/images/devices-showcase.png"
            alt="Plotzy running on a MacBook Pro showing the chapter editor, alongside an iPad Pro showing the open-book reader"
            className="w-full max-w-[1100px] mx-auto h-auto select-none"
            loading="lazy"
            draggable={false}
          />
        </div>

        {/* Feature tags — single row on sm+, stacked on mobile */}
        <ul className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-12 sm:mb-14 list-none">
          {TAGS.map((tag) => (
            <li
              key={tag}
              className="flex items-center gap-2 text-sm text-[#555]"
            >
              <span className="w-4 h-4 rounded-full bg-[#111]/[0.05] border border-[#111]/[0.08] flex items-center justify-center flex-shrink-0">
                <svg width="9" height="7" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="#111"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-medium">{tag}</span>
            </li>
          ))}
        </ul>

        {/* CTA — text + arrow with subtle underline on hover */}
        <button
          type="button"
          onClick={onCtaClick}
          className="group inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-[#111] hover:gap-3 transition-all duration-200"
        >
          <span className="border-b border-transparent group-hover:border-[#111] transition-colors duration-200">
            Start writing today
          </span>
          <ArrowRight
            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200"
            aria-hidden="true"
          />
        </button>
      </div>
    </section>
  );
}
