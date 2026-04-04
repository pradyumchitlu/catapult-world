> ## Documentation Index
> Fetch the complete documentation index at: https://docs.world.org/llms.txt
> Use this file to discover all available pages before exploring further.

# World ID

> Anonymous proof of human credential for the age of AI

export const Quickstart = ({title = "Developer quickstart", description = "Make your first API request in minutes. Learn the basics of the platform.", buttonHref = "/docs/get-started", buttonLabel = "Get started", children}) => {
  return <div className="not-prose rounded-3xl bg-zinc-100 p-6 md:p-8 dark:bg-zinc-900">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(280px,1fr)_minmax(360px,1.45fr)] md:items-start">
        <div>
          <h3 className="m-0 text-2xl leading-tight font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <p className="mt-3 max-w-[560px] text-[16px] leading-7 text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        </div>

        <div className="quickstart-code min-w-0">{children}</div>
      </div>

      <div className="mt-6 md:mt-4">
        <a href={buttonHref} className="inline-flex items-center justify-center rounded-full border border-transparent bg-zinc-950 px-6 py-3 text-[16px] font-medium !text-white no-underline transition-colors hover:bg-black dark:border-zinc-700 dark:bg-zinc-800 dark:!text-zinc-100 dark:hover:bg-zinc-700">
          {buttonLabel}
        </a>
      </div>
    </div>;
};

World ID is an anonymous proof of human credential that lets people prove they are a real and unique human online without sharing personal information.

In the age of AI, it gives relying parties a high-assurance signal to stop bots, duplicate accounts, and abuse while keeping onboarding fast and privacy-preserving.

World ID credentials extend that trust layer with additional proofs, like proof of age and document-backed signals, without exposing underlying user data.

<Quickstart title="Developer Quickstart" description="Add proof of human to your app with one React widget." buttonHref="/world-id/idkit/integrate" buttonLabel="Open integration guide">
  ```tsx lines theme={null}
  import { IDKitRequestWidget } from "@worldcoin/idkit";
  const rpContext = await getRpContext("verify-account");
  <IDKitRequestWidget
    app_id="app_xxxxx"
    action="verify-account"
    rp_context={rpContext}
    // verify proof + nullifier on your backend
    handleVerify={verifyOnBackend}
    onSuccess={unlockFeature}
  />
  ```
</Quickstart>

## Credentials

<div className="not-prose mt-5">
  <div className="grid gap-4 md:grid-cols-3">
    <div className="overflow-hidden rounded-[12px] border border-zinc-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-600 dark:hover:shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
      <div className="flex items-center justify-center bg-white dark:bg-zinc-900" style={{ height: 120 }}>
        <img src="https://mintcdn.com/tfh/v0PtNd2L1YxZc3lg/images/docs/verification-badge.svg?fit=max&auto=format&n=v0PtNd2L1YxZc3lg&q=85&s=a23795c61265580074bd2ffdc076d868" alt="Proof of Human" style={{ height: 72, width: 72, objectFit: 'contain' }} width="24" height="24" data-path="images/docs/verification-badge.svg" />
      </div>

      <div className="p-4"><h3 className="m-0 text-base font-semibold text-zinc-900 dark:text-zinc-100">Proof of Human</h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Highest-assurance uniqueness signal from Orb verification. Best for one-person-one-action flows and strong Sybil resistance.</p></div>
    </div>

    <div className="overflow-hidden rounded-[12px] border border-zinc-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-600 dark:hover:shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
      <div className="flex items-center justify-center bg-white dark:bg-zinc-900" style={{ height: 120 }}>
        <img src="https://mintcdn.com/tfh/sQ1b4VFjpyh3e7vB/images/docs/passport.png?fit=max&auto=format&n=sQ1b4VFjpyh3e7vB&q=85&s=e4734cdd7678e38595e487f82cb4fdb8" alt="Document" style={{ width: 72, objectFit: 'contain' }} width="374" height="493" data-path="images/docs/passport.png" />
      </div>

      <div className="p-4"><h3 className="m-0 text-base font-semibold text-zinc-900 dark:text-zinc-100">Document</h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Proves possession of a unique government document through NFC checks. Useful for proof of age and document-backed access flows.</p></div>
    </div>

    <div className="overflow-hidden rounded-[12px] border border-zinc-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-600 dark:hover:shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
      <div className="flex items-center justify-center bg-white dark:bg-zinc-900" style={{ height: 120 }}>
        <img src="https://mintcdn.com/tfh/sQ1b4VFjpyh3e7vB/images/docs/selfie-check.png?fit=max&auto=format&n=sQ1b4VFjpyh3e7vB&q=85&s=9a29df36798e203e0f34b10830eb6394" alt="Selfie Check" style={{ height: 72, width: 72, objectFit: 'contain' }} width="352" height="352" data-path="images/docs/selfie-check.png" />
      </div>

      <div className="p-4"><h3 className="m-0 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Selfie Check <div className="method-pill rounded-lg bg-blue-400/20 px-1.5 py-0.5 text-sm leading-5 font-semibold text-blue-700 dark:bg-blue-400/20 dark:text-blue-300">Beta</div></h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Low-friction liveness and uniqueness signal from a selfie flow. Best for sign-up and bot defense where speed matters most.</p></div>
    </div>
  </div>
</div>

## Start building

<CardGroup cols={1}>
  <Card title="Stop bots and duplicate accounts">
    Use proof of human to enforce one human per account and reduce Sybil abuse in rewards, referrals, governance, and account creation.
  </Card>

  <Card title="Protect conversion and user privacy">
    Replace CAPTCHA-heavy or document-heavy gating with reusable proof flows. Relying parties receive proofs, not personal data.
  </Card>
</CardGroup>

## Privacy by architecture

<CardGroup cols={3}>
  <Card title="Zero-knowledge proofs">
    Users prove what is true without revealing personal information. Proofs are unlinkable across apps.
  </Card>

  <Card title="Multi-party computation">
    Matching and uniqueness checks are split across independent nodes so no single party holds complete sensitive data.
  </Card>

  <Card title="Self-custodial">
    Proof generation happens on the user’s device. Your app receives a proof, not raw personal data.
  </Card>
</CardGroup>


Built with [Mintlify](https://mintlify.com).
