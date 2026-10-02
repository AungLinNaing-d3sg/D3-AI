import { aboutContent } from "@/data/home";
import { PhoneChatDemo } from "./demos/PhoneChatDemo";

export function About() {
  const { title, titleHighlight, statement, values } = aboutContent;
  return (
    <section id="about" aria-labelledby="about-title">
      <div className="wrap about-grid">
        <div>
          <h2 id="about-title" data-anim="mask-lines">
            {title} <span className="accent">{titleHighlight}</span>
          </h2>
          <p className="statement" data-anim="scrub-words">
            {statement}
          </p>
          <ul className="values">
            {values.map((value) => (
              <li className="value" data-anim="wipe" key={value.title}>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <PhoneChatDemo />
      </div>
    </section>
  );
}
