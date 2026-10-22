import React from 'react';
import LegalPageLayout, {
  LegalSection,
  PLACEHOLDER_CONTACT_EMAIL,
} from '@/pages/LegalPageLayout';

const TermsPage: React.FC = () => {
  return (
    <LegalPageLayout
      eyebrow="QVANTA legal"
      title="Terms of Service"
      description="These plain-language terms describe the rules for using QVANTA, an interactive quantum computing workspace for building circuits, exploring simulations, and learning with an AI tutor."
      lastUpdated="October 18, 2026"
    >
      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 text-sm leading-7 text-text-200">
        <strong className="text-cyan-200">Plain-language summary:</strong> QVANTA helps you learn and experiment.
        Keep your account secure, only submit material you have the right to use, check AI and simulation results,
        and do not rely on the service for safety-critical or professional decisions.
      </div>

      <LegalSection title="1. Agreement and the QVANTA service">
        <p>
          By creating an account or using QVANTA, you agree to these Terms of Service and the QVANTA Privacy Policy.
          QVANTA includes the web application, account features, circuit builder, simulation tools, learning content,
          and AI Tutor features that we make available from time to time.
        </p>
        <p>
          If you use QVANTA for an organization, you confirm that you have authority to accept these terms for that
          organization. If you do not agree, do not create an account or use the service.
        </p>
      </LegalSection>

      <LegalSection title="2. Local and demo mode">
        <p>
          QVANTA may expose a local development or demo login when it is running on a local development host. That
          path is for testing the product and its interface, not for production authentication or a secure account.
        </p>
        <p>
          Local and demo data may be stored only in a local browser or development API, may be reset without notice,
          and may not have production backup, access-control, or retention guarantees. Do not enter personal,
          regulated, confidential, or otherwise sensitive information into local/demo mode.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts, security, and your responsibilities">
        <p>
          Provide an email address and other account information that is accurate enough for the service to work.
          Keep your password and tokens private, use a unique password, and sign out of shared devices. You are
          responsible for activity under your account and for telling the service operator promptly if you suspect
          unauthorized access.
        </p>
        <p>
          You must follow applicable laws, respect other people&apos;s rights, and make sure you have permission to
          submit any code, circuit, prompt, dataset, or other material that you place in QVANTA.
        </p>
      </LegalSection>

      <LegalSection title="4. Your circuits, prompts, and other content">
        <p>
          You keep the rights you already have in your circuit definitions, code, prompts, notes, and other content
          you submit (your “Content”). You give QVANTA the limited permission needed to host, transmit, display,
          process, and return that Content so the requested features work, including saving a circuit to your account
          when the product supports that feature.
        </p>
        <p>
          Running a simulation or asking the AI Tutor can involve sending circuit definitions, simulator settings,
          results, prompts, and related technical metadata to the QVANTA API and to configured AI or other service
          providers. Do not submit secrets or information that you are not comfortable sending through those systems.
          The Privacy Policy explains this flow in more detail.
        </p>
      </LegalSection>

      <LegalSection title="5. AI Tutor and simulation limitations">
        <p>
          The AI Tutor produces generated educational suggestions. It can be incomplete, outdated, or wrong, and it
          may confidently suggest an invalid circuit or explanation. Simulation results are models and learning aids;
          they are not a guarantee of what physical hardware, a provider, or a future run will do.
        </p>
        <p>
          QVANTA is not a substitute for a teacher, engineer, security professional, lawyer, doctor, financial
          adviser, or other qualified professional. Verify outputs and use qualified human review before acting on
          them, especially for safety-critical, regulated, research, or production work.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>You may not use QVANTA to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>break the law, infringe rights, or violate another service&apos;s terms;</li>
          <li>upload malware, credentials, personal data without a lawful basis, or content you do not have permission to use;</li>
          <li>probe, disrupt, overload, scrape, reverse engineer, or bypass limits or security controls;</li>
          <li>impersonate someone, misrepresent AI output as verified work, or interfere with another user&apos;s account; or</li>
          <li>make safety-critical, high-risk, or production decisions without appropriate independent review.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Third-party providers">
        <p>
          QVANTA may rely on third parties for hosting, authentication, analytics, AI models, APIs, storage, or
          quantum-related services. Those providers are independent from QVANTA. Their own terms, privacy notices,
          limits, outages, and security practices may apply, and QVANTA does not control or guarantee them.
        </p>
        <p>
          A provider may change or discontinue an integration, reject a request, or produce a different result. The
          availability of a provider is not a promise that any QVANTA feature will remain available.
        </p>
      </LegalSection>

      <LegalSection title="8. Availability and disclaimers">
        <p>
          QVANTA may be changed, paused, limited, or discontinued, including for maintenance, security, provider
          changes, or development work. We do not promise that it will be uninterrupted, error-free, secure, or
          suitable for every purpose. Keep copies of important work and independently validate anything you need.
        </p>
        <p>
          To the extent allowed by law, QVANTA is provided “as is” and “as available,” without implied promises of
          merchantability, fitness for a particular purpose, accuracy, non-infringement, or uninterrupted operation.
          Nothing here limits rights that cannot legally be limited.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual property">
        <p>
          QVANTA and its software, interface, visual design, names, logos, documentation, and original learning
          materials belong to the service operator or its licensors. These terms give you a limited, revocable,
          non-exclusive right to use the service for its intended purpose; they do not transfer ownership.
        </p>
        <p>
          If you send suggestions or feedback, you allow the service operator to use that feedback to improve QVANTA
          without owing you compensation. You remain responsible for respecting third-party and open-source licenses
          in Content you submit or use.
        </p>
      </LegalSection>

      <LegalSection title="10. Suspension and termination">
        <p>
          You may stop using QVANTA at any time. The service operator may suspend or terminate access when reasonably
          needed to protect the service, investigate abuse, comply with law, address security issues, or discontinue
          a feature. We may not be able to recover Content after an account or local environment is removed, so keep
          your own copies.
        </p>
        <p>
          Provisions about Content rights, acceptable use, disclaimers, limitations, and any obligations that should
          continue by their nature remain effective after access ends.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes and contact">
        <p>
          We may update these terms as the product or its data flows change. The “Last updated” date shows when this
          page was most recently revised. Continuing to use QVANTA after an update means you accept the revised terms;
          if a change matters to you, stop using the service and contact the operator.
        </p>
        <p>
          Contact address: <a className="text-primary-300 underline hover:text-primary-200" href={`mailto:${PLACEHOLDER_CONTACT_EMAIL}`}>
            [PLACEHOLDER CONTACT EMAIL]
          </a>{' '}
          ({PLACEHOLDER_CONTACT_EMAIL}). This is an intentional placeholder and must be replaced with the responsible
          operator&apos;s monitored address before production launch. No legal entity or address is represented here.
        </p>
      </LegalSection>

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm leading-7 text-amber-100">
        <strong>Not legal advice:</strong> This plain-language baseline is not legal advice and is not a complete
        jurisdiction-specific contract. Have qualified counsel review and adapt it to the service operator, users,
        providers, data flows, and launch jurisdictions before relying on it in production.
      </div>
    </LegalPageLayout>
  );
};

export default TermsPage;
