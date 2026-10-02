import { QUICK_REPLIES, REPLIES, REPLY_KEYS, replyFor } from "@/lib/chat/assistant";
import { siteConfig } from "@/data/site";

describe("chat assistant", () => {
  it.each([
    ["Hi there", "hello"],
    ["How much would a project cost?", "start"],
    ["Where is your office?", "location"],
    ["Can I talk to a person?", "contact"],
    ["Do you do Dynamics 365 upgrades?", "dynamics"],
    ["We need Power Automate flows", "dynamics"],
    ["Do you build mobile apps?", "digital"],
    ["Can you help with Power BI dashboards?", "data"],
    ["What services do you offer?", "services"],
    ["Tell me a joke", "fallback"],
  ])("routes %p to the %p reply", (text, key) => {
    expect(replyFor(text)).toBe(key);
  });

  it("has a non-empty scripted reply for every intent", () => {
    REPLY_KEYS.forEach((key) => {
      expect(REPLIES[key].length).toBeGreaterThan(0);
    });
  });

  it("only offers quick replies that map to a known intent", () => {
    QUICK_REPLIES.forEach((reply) => {
      expect(REPLY_KEYS).toContain(reply.key);
    });
  });

  it("points people to the real contact details rather than inventing any", () => {
    const contactLinks = REPLIES.contact.filter((part) => typeof part !== "string");
    expect(contactLinks).toEqual(
      expect.arrayContaining([
        { href: `mailto:${siteConfig.email}`, label: siteConfig.email },
        { href: `tel:${siteConfig.phoneHref}`, label: siteConfig.phone },
      ])
    );
  });
});
