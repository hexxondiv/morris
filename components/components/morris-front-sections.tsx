import Image from "next/image";

const NUGGETS = [
  {
    title: "Sincerity",
    body: "Straight talk with constituents-no performance, just accountable representation.",
  },
  {
    title: "Integrity",
    body: "Decisions guided by ethics and transparency, not shortcuts or back-room deals.",
  },
  {
    title: "Competence",
    body: "A track record across business, media, civic mobilisation, and youth leadership.",
  },
  {
    title: "Capacity",
    body: "Proven ability to organise people, deliver programmes, and follow through under pressure.",
  },
] as const;

export function MorrisNuggets() {
  return (
    <section
      id="nuggets"
      aria-labelledby="nuggets-heading"
      className="border-y border-theme-200 bg-white py-16 sm:py-20"
    >
      <div className="container mx-auto max-w-6xl px-6 sm:px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-600">
            Why it matters
          </p>
          <h2
            id="nuggets-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-theme-900 sm:text-4xl"
          >
            Choose leadership you can trust
          </h2>
          <p className="mt-4 text-lg text-theme-700">
            The same values on the campaign trail are the standards Morris Monye brings to public
            service.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {NUGGETS.map((n) => (
            <li
              key={n.title}
              className="rounded-2xl border border-theme-100 bg-theme-50/60 p-6 shadow-sm"
            >
              <p className="text-lg font-semibold text-theme-900">{n.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-theme-700">{n.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function MorrisAbout() {
  return (
    <section
      id="about-morris"
      aria-labelledby="about-morris-heading"
      className="bg-old-lace py-16 sm:py-24"
    >
      <div className="container mx-auto max-w-6xl px-6 sm:px-4">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-600">
              About Morris
            </p>
            <h2
              id="about-morris-heading"
              className="text-3xl font-bold tracking-tight text-theme-900 sm:text-4xl"
            >
              From enterprise and civic action to the State House of Assembly
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-theme-800">
              <p>
                Morris Monye is running to represent{" "}
                <strong>Aniocha North</strong> in the <strong>Delta State House of Assembly</strong>
                —bringing grassroots energy, digital reach, and a record of building institutions
                into the legislature.
              </p>
              <p>
                He is the founder and CEO of{" "}
                <strong>Mo Credits Limited</strong>, a fintech focused on microloans and
                financial inclusion, and of <strong>Crisp Agro Limited</strong>, an agribusiness
                centred on rice production and food security.
              </p>
              <p>
                During the 2023 elections he convened the <strong>Super Volunteers for Peter Obi</strong>
                , a nationwide grassroots network, and has continued to speak on politics, civic
                engagement, and good governance. In 2024 he was appointed{" "}
                <strong>Chairman of the Delta State E-Sports Association</strong>, championing youth,
                digital skills, and structured competition.
              </p>
              <p>
                He holds a <strong>B.Eng. in Petroleum Engineering</strong> from the University of
                Benin and executive education in accounting and finance for non-finance managers
                from Lagos Business School.
              </p>
            </div>
            <p className="text-sm text-theme-600">
              Public profile and civic work:{" "}
              <a
                href="https://democracybuilders.ng/team/morris-monye/"
                className="font-medium text-theme-700 underline underline-offset-2 hover:text-theme-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                Democracy Builders — Morris Monye
              </a>
              . Follow updates on{" "}
              <a
                href="https://www.instagram.com/morris_monye/"
                className="font-medium text-theme-700 underline underline-offset-2 hover:text-theme-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              .
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <figure className="w-full overflow-hidden rounded-2xl border border-theme-200 shadow-lg">
              <Image
                src="/morris/m2.jpeg"
                alt="Morris Monye"
                width={1200}
                height={1600}
                className="h-auto w-full object-cover object-top"
                sizes="(min-width: 1024px) 40vw, 100vw"
                priority
              />
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
