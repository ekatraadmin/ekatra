import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Clock3, Mail, Target, Brain, CalendarDays } from "lucide-react";
import "./PublicInfoPage.css";

const pageTitles = {
  about: "About Ekatra",
  contact: "Contact us",
  privacy: "Privacy policy",
  terms: "Terms and conditions",
  resources: "Study resources",
};

function SiteBrand() {
  return (
    <a className="info-brand" href="/" aria-label="Ekatra home">
      <img className="info-brand-mark" src="/ekatra-mark.svg" alt="" aria-hidden="true" />
      <span>Ekatra</span>
    </a>
  );
}

function InfoShell({ children, page }) {
  return (
    <div className="info-site">
      <header className="info-header">
        <SiteBrand />
        <nav aria-label="Main navigation">
          <a href="/resources">Study resources</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a className="info-header-cta" href="/">Open Ekatra <ArrowRight size={15} /></a>
        </nav>
      </header>
      <main className="info-main">
        <a className="info-back" href="/"><ArrowLeft size={15} /> Back to home</a>
        <div className="info-eyebrow">EKATRA · {page.toUpperCase()}</div>
        {children}
      </main>
      <footer className="info-footer">
        <SiteBrand />
        <nav aria-label="Legal links">
          <a href="/about">About</a>
          <a href="/resources">Study resources</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy policy</a>
          <a href="/terms">Terms</a>
        </nav>
        <span>© {new Date().getFullYear()} Ekatra</span>
      </footer>
    </div>
  );
}

function AboutPage() {
  return (
    <>
      <h1>Make study time more focused, organised and connected.</h1>
      <p className="info-lead">
        Ekatra is a digital study space designed to help students build
        consistent study habits, focus on their work and learn alongside a community.
      </p>
      <section className="info-section">
        <h2>Why we built Ekatra</h2>
        <p>
          Studying can feel difficult when it is unstructured or isolating.
          Ekatra brings useful study tools into one place so students can
          plan sessions, work independently and connect with other learners when
          they want company or accountability.
        </p>
      </section>
      <section className="info-section">
        <h2>What you can do</h2>
        <div className="info-feature-grid">
          <article><Clock3 /><h3>Focus sessions</h3><p>Set aside dedicated time for a task and reduce distractions while you work.</p></article>
          <article><BookOpen /><h3>Study rooms</h3><p>Join or create study spaces to work alongside classmates and friends.</p></article>
          <article><Target /><h3>Study goals</h3><p>Set goals and make your learning intentions easier to follow.</p></article>
          <article><Brain /><h3>Study progress</h3><p>Review study activity and reflect on the habits you are building.</p></article>
        </div>
      </section>
      <section className="info-section">
        <h2>Our approach</h2>
        <p>
          We believe useful study tools should be straightforward and welcoming.
          Ekatra is built around focus, consistency and peer learning.
          It supports a student's learning routine; it does not replace teachers,
          textbooks, official course materials or professional academic guidance.
        </p>
      </section>
    </>
  );
}

function ContactPage() {
  return (
    <>
      <h1>We’d like to hear from you.</h1>
      <p className="info-lead">
        Have a question, found a problem or want to share feedback about
        Ekatra? Get in touch with the team.
      </p>
      <section className="info-contact-card">
        <div className="info-contact-icon"><Mail /></div>
        <div>
          <h2>Email support</h2>
          <p>
            For questions, feedback or support, email us at{" "}
            <a href="mailto:ekatrasupport@gmail.com">ekatrasupport@gmail.com</a>.
          </p>
          <a className="info-text-link" href="/">Return to Ekatra <ArrowRight size={15} /></a>
        </div>
      </section>
      <section className="info-section">
        <h2>When you contact us</h2>
        <p>
          Please include a short description of your question and the page or
          feature involved. Do not send your password, verification codes or
          other sensitive account credentials by email.
        </p>
      </section>
    </>
  );
}

function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="info-meta">Last updated: 1 November 2026</p>
      <p className="info-lead">
        This policy explains how Ekatra may collect, use and protect
        information when you visit the website or use its study features.
      </p>
      <section className="info-section">
        <h2>1. Information you provide</h2>
        <p>
          Depending on the features you use, this may include your email address,
          account credentials handled by our authentication provider, display
          name, username, profile details, study goals, room details, messages
          and files or images you choose to share.
        </p>
      </section>
      <section className="info-section">
        <h2>2. Information created through use</h2>
        <p>
          The service may process information such as room memberships, study
          session activity, goal progress, timestamps and technical information
          needed to operate, secure and troubleshoot the website.
        </p>
      </section>
      <section className="info-section">
        <h2>3. How information is used</h2>
        <p>
          Information is used to provide account access and study features,
          display your profile and activity, enable room and messaging functions,
          maintain security, respond to support requests and improve the service.
        </p>
      </section>
      <section className="info-section">
        <h2>4. Service providers</h2>
        <p>
          Ekatra uses Supabase for services including authentication and
          database, storage and real-time functionality. Information may be
          processed by these providers to deliver the features you request,
          subject to their terms and privacy practices. We do not publish
          passwords in profile pages or public content.
        </p>
      </section>
      <section className="info-section">
        <h2>5. Cookies, advertising and similar technologies</h2>
        <p>
          Ekatra uses essential browser storage for sign-in and core
          functionality. When Google ads are displayed, Google and other
          third-party vendors may use cookies to serve ads based on your prior
          visits to this site or other websites. Google's use of advertising
          cookies enables Google and its partners to serve ads based on those
          visits. You can opt out of personalised advertising in{" "}
          <a href="https://adssettings.google.com/" target="_blank" rel="noreferrer">
            Google Ads Settings
          </a>{" "}
          or learn about additional opt-out choices at{" "}
          <a href="https://www.aboutads.info/" target="_blank" rel="noreferrer">
            aboutads.info
          </a>
          . You can also manage cookies in your browser. Where required, Ekatra
          will use a consent mechanism before serving personalised ads.
        </p>
      </section>
      <section className="info-section">
        <h2>6. Sharing and disclosure</h2>
        <p>
          We may share information with service providers that help operate the
          website, when required by law, to protect users and the service, or
          when you choose to share information through social or room features.
          We do not make private messages public as website content.
        </p>
      </section>
      <section className="info-section">
        <h2>7. Retention and security</h2>
        <p>
          Information is retained for as long as needed to provide the service,
          meet legitimate operational needs and comply with legal obligations.
          We use provider and technical safeguards, but no internet service can
          guarantee absolute security.
        </p>
      </section>
      <section className="info-section">
        <h2>8. Your choices</h2>
        <p>
          Keep your account details accurate, avoid sharing sensitive information
          in rooms or messages, and contact the site operator to ask about
          access, correction or deletion requests. Some information may need to
          be retained where required for security or legal reasons.
        </p>
      </section>
      <section className="info-section">
        <h2>9. Children and student users</h2>
        <p>
          Ekatra is intended for students. If you are under the age
          required to consent to online data processing in your location, use
          the service only with any parent or guardian permission required by
          applicable law.
        </p>
      </section>
      <section className="info-section">
        <h2>10. Changes and contact</h2>
        <p>
          This policy may be updated as the service changes. The latest version
          will be published on this page. For privacy questions or requests,
          contact the website operator using the support contact published on
          the Contact page.
        </p>
      </section>
    </>
  );
}

function TermsPage() {
  return (
    <>
      <h1>Terms and conditions</h1>
      <p className="info-meta">Last updated: 1 November 2026</p>
      <p className="info-lead">
        By accessing Ekatra, you agree to use the service responsibly
        and follow these terms. If you do not agree, do not use the service.
      </p>
      <section className="info-section"><h2>1. The service</h2><p>Ekatra provides online study tools and community features, which may include focus sessions, goals, study rooms, chat and progress views. Features may change, be interrupted or become unavailable as the service develops.</p></section>
      <section className="info-section"><h2>2. Accounts</h2><p>You are responsible for keeping your sign-in credentials secure and for activity carried out through your account. Provide accurate information and notify the site operator if you believe your account has been accessed without permission. Do not impersonate another person or create accounts for unlawful purposes.</p></section>
      <section className="info-section"><h2>3. Acceptable use</h2><p>You must not use Ekatra to harass, threaten, bully or exploit others; share unlawful, harmful or infringing material; spam or disrupt rooms; attempt unauthorised access; interfere with the service; or violate another person's privacy or rights.</p></section>
      <section className="info-section"><h2>4. User content</h2><p>You retain responsibility for the messages, profile details, images and other material you submit. You must have the rights and permissions needed to share that material. You give Ekatra permission to host, process and display it only as reasonably needed to operate the features you choose to use.</p></section>
      <section className="info-section"><h2>5. Study rooms and communication</h2><p>Be respectful when interacting with other users. Do not share private room codes, personal details or another person's content without permission. You are responsible for deciding what to share in rooms and chats.</p></section>
      <section className="info-section"><h2>6. Intellectual property</h2><p>The Ekatra name, branding, website design and original service materials are protected by applicable intellectual property laws. You may not copy or commercially exploit them without permission. These terms do not transfer ownership of your own content to the service.</p></section>
      <section className="info-section"><h2>7. Suspension and termination</h2><p>Access may be restricted or suspended where there is a breach of these terms, a security risk, unlawful activity or a need to protect users or the service. You may stop using the service at any time.</p></section>
      <section className="info-section"><h2>8. Disclaimers</h2><p>Ekatra is a study-support tool, not an educational institution, tutor or source of guaranteed academic outcomes. The service is provided on an “as available” basis to the extent permitted by law. Keep your own copies of important study materials.</p></section>
      <section className="info-section"><h2>9. Limitation of liability</h2><p>To the extent permitted by applicable law, Ekatra is not liable for indirect or consequential losses arising from use of, or inability to use, the service. Nothing in these terms excludes liability that cannot legally be excluded.</p></section>
      <section className="info-section"><h2>10. Changes and contact</h2><p>These terms may be updated as the service evolves. Continued use after an updated version is published means you accept the revised terms, to the extent permitted by law. For questions, use the contact details published on the Contact page.</p></section>
    </>
  );
}

function ResourcesPage() {
  return (
    <>
      <h1>Practical study methods you can start using today.</h1>
      <p className="info-lead">
        These short guides explain evidence-informed learning techniques and
        show how to turn them into a realistic study routine.
      </p>
      <article className="info-resource">
        <div className="info-resource-icon"><Clock3 /></div>
        <div>
          <span className="info-resource-label">FOCUS & TIME MANAGEMENT</span>
          <h2>The Pomodoro technique: work in focused intervals</h2>
          <p>
            Choose one clearly defined task. Work on it for about 25 minutes
            without switching tasks, then take a short 5-minute break. After
            four intervals, take a longer break. Adjust the interval length
            when a task needs more uninterrupted concentration.
          </p>
          <h3>Try it</h3>
          <ol><li>Write down the single task you will work on.</li><li>Set a timer and silence non-essential notifications.</li><li>When the interval ends, record what you completed.</li><li>Take a short break away from the screen and repeat if needed.</li></ol>
          <p className="info-tip"><strong>Useful tip:</strong> If you lose focus, note the distraction and return to the task instead of abandoning the session.</p>
        </div>
      </article>
      <article className="info-resource">
        <div className="info-resource-icon"><Brain /></div>
        <div>
          <span className="info-resource-label">MEMORY & RETENTION</span>
          <h2>Active recall: practise remembering, not just rereading</h2>
          <p>
            Active recall means trying to retrieve information from memory
            before looking at the answer. It can reveal gaps in understanding
            that passive rereading may hide.
          </p>
          <h3>Try it</h3>
          <ol><li>Read a small section and close the book or notes.</li><li>Write or explain the main ideas from memory.</li><li>Check your explanation against the source.</li><li>Turn missed points into questions and test yourself again later.</li></ol>
          <p className="info-tip"><strong>Useful tip:</strong> Explain a concept in your own words, as if teaching it to a beginner.</p>
        </div>
      </article>
      <article className="info-resource">
        <div className="info-resource-icon"><CalendarDays /></div>
        <div>
          <span className="info-resource-label">LONG-TERM LEARNING</span>
          <h2>Spaced repetition: revisit material over time</h2>
          <p>
            Instead of reviewing everything in one long session, revisit
            important ideas across several days. Try recalling the material
            at increasing intervals and spend more time on topics you find
            difficult.
          </p>
          <h3>A simple review schedule</h3>
          <ol><li>Review the topic on the day you first learn it.</li><li>Test yourself the next day.</li><li>Review again after about three days.</li><li>Return after a week, then adjust based on how well you remember it.</li></ol>
          <p className="info-tip"><strong>Useful tip:</strong> Use questions or flashcards for each review instead of simply reading the same notes again.</p>
        </div>
      </article>
      <section className="info-section">
        <h2>Build a realistic weekly study plan</h2>
        <p>Start with your deadlines, divide large topics into smaller tasks and assign each task a time slot. Leave some open time for revision and unexpected work. At the end of the week, review what worked and adjust the next plan rather than trying to follow an unrealistic timetable.</p>
      </section>
      <div className="info-resource-cta"><div><h2>Ready to put a plan into practice?</h2><p>Use Ekatra to organise a focused session and work towards your study goals.</p></div><a href="/">Open Ekatra <ArrowRight size={16} /></a></div>
    </>
  );
}

export default function PublicInfoPage({ page }) {
  useEffect(() => {
    document.title = `${pageTitles[page] || "Information"} | Ekatra`;
  }, [page]);

  const content = {
    about: <AboutPage />,
    contact: <ContactPage />,
    privacy: <PrivacyPage />,
    terms: <TermsPage />,
    resources: <ResourcesPage />,
  }[page] || <AboutPage />;

  return (
    <InfoShell page={pageTitles[page] || "INFORMATION"}>
      <div className={`info-content info-${page}`}>
        {content}
      </div>
    </InfoShell>
  );
}
