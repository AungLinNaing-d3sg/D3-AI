"use client";

import Image from "next/image";
import { gsap } from "@/lib/motion/gsap";
import { siteConfig } from "@/data/site";
import { hold, loop, useDemo, type DemoFactory } from "./useDemo";

/**
 * About: an iPhone showing D3-SG's own company profile — who we are, the
 * leadership credentials (verified one by one), the industries served and
 * the Singapore office on a map. Every fact comes from site.ts / team.ts.
 * Shares the iPhone frame with the Services code demo.
 */

const STATS = [
  { value: 20, suffix: "+", label: "Years leading" },
  { value: 3, suffix: "", label: "Solution areas" },
  { value: 2, suffix: "", label: "Leaders" },
];
const CREDENTIALS = ["ITIL", "PMP", "Six Sigma Black Belt", "Certified Scrum Master"];
const INDUSTRIES = ["Public Sector", "Education", "Logistics", "Transportation"];

const profile: DemoFactory<HTMLDivElement> = (wrap) => {
  const scroller = wrap.querySelector<HTMLElement>(".ap-scroll")!;
  const parts = Array.from(wrap.querySelectorAll<HTMLElement>(".ap-part"));
  const nums = Array.from(wrap.querySelectorAll<HTMLElement>(".ap-num"));
  const creds = Array.from(wrap.querySelectorAll<HTMLElement>(".ap-cred"));
  const chips = Array.from(wrap.querySelectorAll<HTMLElement>(".ap-chip"));
  const pin = wrap.querySelector<HTMLElement>(".ap-pin")!;
  const badges = Array.from(wrap.querySelectorAll<HTMLElement>(".phone-chip"));

  return loop(
    () => {
      const tl = gsap.timeline();
      tl.call(() => {
        gsap.set(scroller, { y: 0 });
        parts.forEach((p) => p.classList.add("is-hidden"));
        nums.forEach((n) => { n.textContent = "0"; });
        creds.forEach((c) => { c.className = "ap-cred"; });
        chips.forEach((c) => c.classList.add("is-hidden"));
        pin.classList.remove("is-dropped");
        badges.forEach((b) => b.classList.remove("show"));
      });
      hold(tl, 0.4);
      parts.slice(0, 2).forEach((p) => {
        tl.call(() => p.classList.remove("is-hidden"));
        hold(tl, 0.25);
      });
      nums.forEach((n, i) => {
        const v = { n: 0 };
        tl.to(v, { n: STATS[i]!.value, duration: 0.9, ease: "power2.out", onUpdate: () => { n.textContent = String(Math.round(v.n)); } }, i ? "<0.1" : ">");
      });
      tl.call(() => parts[2]?.classList.remove("is-hidden"));
      hold(tl, 0.3);
      creds.forEach((c, i) => {
        tl.call(() => { c.className = "ap-cred is-checking"; });
        hold(tl, 0.38);
        tl.call(() => {
          c.className = "ap-cred is-ok";
          if (i === creds.length - 1) badges[0]?.classList.add("show");
        });
      });
      tl.call(() => parts[3]?.classList.remove("is-hidden"));
      chips.forEach((c) => {
        tl.call(() => c.classList.remove("is-hidden"));
        hold(tl, 0.12);
      });
      hold(tl, 0.5);
      // Scroll the profile down to the office map; the pin drops in.
      tl.call(() => parts[4]?.classList.remove("is-hidden"));
      tl.to(scroller, { y: () => -(scroller.scrollHeight - (scroller.parentElement?.clientHeight ?? 0)), duration: 1.2, ease: "power3.inOut" });
      tl.call(() => {
        pin.classList.add("is-dropped");
        badges[1]?.classList.add("show");
      });
      hold(tl, 2.6);
      tl.to(scroller, { y: 0, duration: 1, ease: "power3.inOut" });
      return hold(tl, 1.4);
    },
    0.6,
    2
  );
};

export function CompanyProfilePhone() {
  const ref = useDemo(profile);
  return (
    <div className="phone-wrap" data-anim="clip-up" ref={ref}>
      <div className="phone-chip pc1 show" aria-hidden="true">
        ✓ <b>4</b> leadership certifications
      </div>
      <div className="phone-chip pc2 show" aria-hidden="true">
        📍 Paya Lebar, <b>Singapore</b>
      </div>
      <div className="iphone ip-lg" aria-hidden="true">
        <span className="ip-btn-side l1" />
        <span className="ip-btn-side l2" />
        <span className="ip-btn-side r1" />
        <div className="ip-screen ap-screen">
          <div className="ip-island" />
          <div className="ip-status">
            <b>9:41</b>
            <span>
              <svg viewBox="0 0 18 12">
                <path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V4H9zM13 11h2V1h-2z" />
              </svg>
              <svg viewBox="0 0 16 12">
                <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.5 7a6.4 6.4 0 0 1 9 0l-1.3 1.3a4.6 4.6 0 0 0-6.4 0zM1 4.5a10 10 0 0 1 14 0l-1.3 1.3a8.2 8.2 0 0 0-11.4 0z" />
              </svg>
              <i className="ip-battery" />
            </span>
          </div>
          <div className="ap-appbar">
            <span className="ap-icon">‹</span>
            <b>Company</b>
            <span className="ap-icon">⋯</span>
          </div>
          <div className="ap-viewport">
            <div className="ap-scroll">
              <div className="ap-part ap-hero">
                <div className="ap-cover" />
                <div className="ap-logo">
                  <Image src="/D3SG-logo.png" alt="" width={90} height={28} />
                </div>
                <div className="ap-name">
                  {siteConfig.legalName} <i className="ap-verified">✓</i>
                </div>
                <small>IT solutions provider · Singapore</small>
                <div className="ap-tags">
                  <span>Data &amp; AI</span>
                  <span>Dynamics 365</span>
                  <span>Digital</span>
                </div>
              </div>
              <div className="ap-part ap-stats">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <b>
                      <span className="ap-num">{s.value}</span>
                      {s.suffix}
                    </b>
                    <small>{s.label}</small>
                  </div>
                ))}
              </div>
              <div className="ap-part ap-card">
                <h4>Credentials</h4>
                {CREDENTIALS.map((c) => (
                  <div className="ap-cred is-ok" key={c}>
                    <span>{c}</span>
                    <i />
                  </div>
                ))}
              </div>
              <div className="ap-part ap-card">
                <h4>Industries</h4>
                <div className="ap-chips">
                  {INDUSTRIES.map((c) => (
                    <span className="ap-chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ap-part ap-card ap-map-card">
                <div className="ap-map">
                  <i className="ap-road r1" />
                  <i className="ap-road r2" />
                  <i className="ap-road r3" />
                  <i className="ap-park" />
                  <span className="ap-pin is-dropped" />
                </div>
                <b>Paya Lebar Square</b>
                <small>{siteConfig.addressLines[0]}</small>
              </div>
            </div>
          </div>
          <div className="ip-tabbar">
            <i />
            <i className="on" />
            <i />
            <i />
          </div>
          <span className="ip-home" />
        </div>
      </div>
    </div>
  );
}
