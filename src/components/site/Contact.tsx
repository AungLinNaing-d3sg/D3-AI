import { ContactForm } from "@/components/sections/ContactForm";
import { siteConfig } from "@/data/site";

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title">
      <div className="wrap">
        <div className="cta" data-anim="expand">
          <div>
            <h2 id="contact-title" data-anim="spread">Let’s build what’s next.</h2>
            <p className="lead">
              Have an idea, a challenge, or a vision for what comes next? Let’s turn it into something real, together.
            </p>
            <div className="cta-info">
              <span>
                {siteConfig.contactPerson.name}, {siteConfig.contactPerson.role}
              </span>
              <span>
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> ·{" "}
                <a href={`tel:${siteConfig.phoneHref}`}>{siteConfig.phone}</a>
              </span>
              <span>{siteConfig.addressLines.join(", ")}</span>
            </div>
          </div>
          <div className="form-card">
            <h3 id="contact-form-heading">Send us a message</h3>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
