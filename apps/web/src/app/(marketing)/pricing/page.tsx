import Link from 'next/link';
import { PricingTier } from '@/components/marketing/pricing-tier';

export const metadata = {
  title: 'Pricing - MoveBoss Pro',
  description: 'Simple, transparent pricing for MoveBoss Pro.',
};

const tiers = [
  {
    name: 'Starter',
    price: '$49',
    description: 'For small operations getting started.',
    features: [
      'Up to 3 drivers',
      'Load management',
      'Basic trip planning',
      'Driver mobile app',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: '$149',
    description: 'For growing companies with more complex needs.',
    features: [
      'Up to 15 drivers',
      'Everything in Starter',
      'WhatsApp integration',
      'Financial Brain',
      'FMCSA monitoring',
      'Partner network access',
      'Priority support',
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large operations with custom requirements.',
    features: [
      'Unlimited drivers',
      'Everything in Professional',
      'Custom integrations',
      'Dedicated account manager',
      'API access',
      'Custom reporting',
      'SLA guarantee',
    ],
    ctaText: 'Contact us',
    ctaHref: 'mailto:hello@moveboss.com',
  },
];

const faqs = [
  {
    question: 'Can I try MoveBoss before committing?',
    answer:
      'Yes. All plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'What counts as a driver?',
    answer:
      'A driver is anyone who needs access to the driver mobile app and is assigned to trips. Helpers and crew members are managed separately and do not count toward your driver limit.',
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Yes. You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.',
  },
  {
    question: 'Is there a setup fee?',
    answer:
      'No. There are no setup fees or hidden costs. You only pay your monthly subscription.',
  },
];

export default function PricingPage() {
  return (
    <div className="py-20 px-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold text-white mb-6">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-white/50 max-w-xl mx-auto">
          Start with a 14-day free trial. No credit card required.
        </p>
      </div>

      {/* Pricing Tiers */}
      <div className="max-w-5xl mx-auto mb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <PricingTier
              key={tier.name}
              name={tier.name}
              price={tier.price}
              period={tier.period}
              description={tier.description}
              features={tier.features}
              highlighted={tier.highlighted}
              badge={tier.badge}
              ctaText={tier.ctaText}
              ctaHref={tier.ctaHref}
            />
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-white mb-8 text-center">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <h3 className="text-white font-medium mb-2">{faq.question}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto mt-24 pt-16 border-t border-white/[0.06] text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">Still have questions?</h2>
        <p className="text-white/50 mb-8">
          We&apos;re here to help. Reach out and we&apos;ll get back to you quickly.
        </p>
        <Link
          href="mailto:hello@moveboss.com"
          className="px-6 py-3 text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg border border-white/[0.08] transition-colors inline-block"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
