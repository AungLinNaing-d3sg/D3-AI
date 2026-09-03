import { siteConfig } from "@/data/site";

const items = [
  {
    label: "Email",
    value: siteConfig.email,
    href: `mailto:${siteConfig.email}`,
  },
  {
    label: "Phone",
    value: siteConfig.phone,
    href: `tel:${siteConfig.phoneHref}`,
  },
  {
    label: "Address",
    value: siteConfig.addressLines.join(", "),
    href: undefined,
  },
];

export function ContactInfo() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-50">{siteConfig.contactPerson.name}</h2>
        <p className="text-sm text-ink-400">{siteConfig.contactPerson.role}</p>
        <p className="text-sm text-ink-400">
          {siteConfig.legalName} (UEN: {siteConfig.uen})
        </p>
      </div>

      <dl className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <dt className="text-xs font-semibold tracking-wide text-brand-400 uppercase">{item.label}</dt>
            <dd className="mt-1 text-sm text-ink-100">
              {item.href ? (
                <a href={item.href} className="transition-colors hover:text-brand-300">
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
