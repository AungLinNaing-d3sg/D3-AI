import { ContactForm } from "@/components/sections/ContactForm";
import { siteConfig } from "@/data/site";

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title">
      <div className="wrap">
        <div className="cta" data-reveal>
          <div>
            <span className="kicker">Let’s talk</span>
            <h2 id="contact-title">Let’s build what’s next.</h2>
            <p className="lead">
              Have an idea, a challenge, or a vision for what comes next? Let’s turn it into something real, together.
            </p>
            <div className="cta-info">
              <div>
                <small>Contact</small>
                {siteConfig.contactPerson.name}, {siteConfig.contactPerson.role}
              </div>
              <div>
                <small>Email · Phone</small>
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> ·{" "}
                <a href={`tel:${siteConfig.phoneHref}`}>{siteConfig.phone}</a>
              </div>
              <div>
                <small>Visit</small>
                {siteConfig.addressLines[0]}
                <br />
                {siteConfig.addressLines[1]}
              </div>
            </div>
          </div>
          <div className="form-card">
            <h3 id="contact-form-heading">Send us a message</h3>
            <p>Tell us a little about what you need and the team will get back to you.</p>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
