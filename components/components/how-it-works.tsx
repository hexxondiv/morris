import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CTAButton from "./cta-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
};

const howItWorkSteps = [
  {
    title: 'Step 1 - Join our campaign',
    description:
      "Contribute a daily or monthly pledge to power community projects, local initiatives, and transparent impact in line with our shared values.",
  },
  {
    title: 'Step 2 - Get voting rights',
    description:
      "You'll be issued your voting rights, which you'll use to decide which investments we make and which projects we fund.",
  },
  {
    title: 'Step 3 - Track your impact',
    description:
      "You'll get direct access to all our impact and financial data, and get updates on each project we fund, as well as our team's work.",
  },
];

export function HowItWorksCard({ title, description }: Props) {
  return (
    <Card className="w-full p-2">
      <CardHeader>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-mud-900">{title}</h3>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-5 text-base leading-body text-mud-700">
          {description}
        </div>
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="rounded-full border-mud-700 px-6 py-6"
          >
            My dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function HowItWorks() {
  return (
    <section className="bg-mud-50 pb-8 pt-16 sm:pb-12 sm:pt-24 bg-old-lace">
      <div id="metrics" className="container px-6 sm:px-4 mx-auto">
        <h2 className="text-center section-header">
          How MORRIS MONYE platform works
        </h2>

        <div className="mx-auto mt-12 mb-8 grid max-w-sm gap-8 sm:mb-16 sm:max-w-6xl sm:grid-cols-2 lg:grid-cols-3">
          {howItWorkSteps.map((step, index) => (
            <HowItWorksCard
              key={index}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>

        <div className="mx-auto mt-12 mb-8 text-center px-2 space-y-9">
          <CTAButton href="/dashboard">My dashboard</CTAButton>
        </div>
      </div>
    </section>
  );
}
