import React from 'react';
import LegalPageLayout, {
  LegalSection,
  CONTACT_EMAIL,
} from '@/pages/LegalPageLayout';

const PrivacyPage: React.FC = () => {
  return (
    <LegalPageLayout
      eyebrow="QVANTA legal"
      title="Privacy Policy"
      description="This plain-language notice explains what QVANTA may receive when you create an account, build circuits, run simulations, or use the AI Tutor."
      lastUpdated="October 18, 2026"
    >
      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 text-sm leading-7 text-text-200">
        <strong className="text-cyan-200">Short version:</strong> QVANTA needs account and technical information
        to provide the workspace. Circuit and tutor requests may pass through the QVANTA API and configured
        third-party providers. Do not put secrets or sensitive information into the service unless your approved
        deployment and provider settings support that use.
      </div>

      <LegalSection title="1. Scope and local/demo mode">
        <p>
          This Privacy Policy applies to the QVANTA web application and related account, circuit, simulation, learning,
          and AI Tutor features. It describes the baseline behavior of this product; the actual data flow depends on
          the deployment, enabled integrations, and configuration used by the service operator.
        </p>
        <p>
          A local development or demo host may use a mock account, browser storage, local API, or disposable data.
          Local/demo mode is not a production privacy environment: data may be visible to other people who can access
          the machine or development services, may be reset, and may not receive production retention or deletion
          handling. Do not enter personal, regulated, confidential, or sensitive information there.
        </p>
      </LegalSection>

      <LegalSection title="2. Information QVANTA may receive">
        <p>Depending on the features you use and the deployment configuration, QVANTA may receive:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-text-200">Account information:</strong> email address, authentication identifiers, role or plan, and account timestamps.</li>
          <li><strong className="text-text-200">Workspace content:</strong> circuit definitions, code, simulator settings, measurement results, notes, and other content you choose to save.</li>
          <li><strong className="text-text-200">Tutor requests:</strong> prompts, conversation messages, generated responses, and context you provide to the AI Tutor.</li>
          <li><strong className="text-text-200">Technical information:</strong> device and browser details, IP or network information available to the deployment, logs, error reports, feature usage, and security events.</li>
          <li><strong className="text-text-200">Messages to us:</strong> information you include when you contact the service operator or request support.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How information is used">
        <p>Information may be used to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>create and authenticate your account and keep sessions working;</li>
          <li>save, load, simulate, display, and troubleshoot your circuits and workspace;</li>
          <li>send tutor prompts and circuit context to the AI features you request and return their results;</li>
          <li>operate, secure, debug, measure, and improve QVANTA and its integrations;</li>
          <li>prevent abuse, enforce the Terms of Service, and comply with legal obligations; and</li>
          <li>respond to support or contact requests.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. API, AI Tutor, and circuit data handling">
        <p>
          When you run a simulation or use the AI Tutor, the request may include your circuit or code, gates and
          parameters, simulator settings, results, prompt or conversation text, account or session identifiers, and
          technical metadata. The QVANTA web client may send that information to the QVANTA API so the requested
          feature can run.
        </p>
        <p>
          The API may then call an enabled AI model, quantum service, storage system, or other provider. Those
          providers can process the request under their own terms and privacy notices. Provider retention, model
          training, location, and security controls depend on the provider and configuration; this baseline does not
          promise that a provider will delete data immediately or never use it to improve its services. Review the
          provider settings before sending confidential material.
        </p>
        <p>
          QVANTA does not need you to submit secrets to teach quantum concepts. Use synthetic or non-sensitive
          examples whenever possible, and remove credentials, private keys, personal data, and confidential research
          from prompts and circuits.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-party services and sharing">
        <p>
          QVANTA may share information with service providers that host the application, authenticate users, store
          data, provide analytics or error monitoring, or supply AI, API, and quantum features. They may process only
          what the configured integration needs, but their independent terms and privacy practices apply. QVANTA does
          not control third-party outages, security, retention, or changes.
        </p>
        <p>
          Information may also be disclosed when needed to protect users or the service, investigate abuse, respond
          to lawful requests, enforce the Terms of Service, or complete a business or infrastructure change. We do not
          promise that every deployment has the same providers or data locations.
        </p>
      </LegalSection>

      <LegalSection title="6. Storage, retention, and deletion">
        <p>
          Account and workspace data may be stored in the deployment&apos;s database, object storage, logs, browser
          storage, or provider systems. We retain information for as long as needed to provide the requested feature,
          maintain security and reliability, resolve disputes, meet legal obligations, or keep backups and operational
          records. Retention periods vary by deployment and provider.
        </p>
        <p>
          You can stop sending new Content and may request account or data deletion from the service operator. A
          deletion request may not remove information already held in provider backups, security logs, or systems that
          must be retained by law. Local/demo data may instead be removed by clearing the relevant local environment.
        </p>
      </LegalSection>

      <LegalSection title="7. Security and your choices">
        <p>
          The service operator may use authentication controls, access restrictions, encrypted connections, logging,
          and other safeguards appropriate to its deployment. No internet service or local development environment is
          guaranteed to be perfectly secure, so protect your credentials and avoid sending information that requires
          controls QVANTA or its providers do not offer.
        </p>
        <p>
          Depending on where you live and how the service is operated, you may have rights to access, correct, delete,
          restrict, or object to certain processing. You may also be able to withdraw consent where consent is the
          basis for processing. Requests and applicable exceptions are handled by the responsible operator, not by the
          QVANTA interface alone.
        </p>
      </LegalSection>

      <LegalSection title="8. Children and sensitive information">
        <p>
          QVANTA is an educational software workspace, not a service designed to collect sensitive personal
          information from children. Do not use it to submit health, financial, government-identification, precise
          location, biometric, or other sensitive information unless the responsible deployment has documented a
          lawful and appropriate process for that data.
        </p>
      </LegalSection>

      <LegalSection title="9. Updates and contact">
        <p>
          We may update this notice when the product, integrations, or data flows change. The “Last updated” date
          identifies the current revision. If the change is important, the responsible operator should provide any
          additional notice required for its users or jurisdiction.
        </p>
        <p>
          Privacy questions or requests:{' '}
          <a className="text-primary-300 underline hover:text-primary-200" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          . Use this address to ask about this notice, your data, or a deletion request.
        </p>
      </LegalSection>

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm leading-7 text-amber-100">
        <strong>Not legal advice:</strong> This plain-language baseline is not legal advice and is not a complete
        privacy notice for every jurisdiction or provider. Have qualified privacy counsel review and adapt it to the
        actual operator, legal bases, vendors, retention rules, user rights, and production data flows before launch.
      </div>
    </LegalPageLayout>
  );
};

export default PrivacyPage;
