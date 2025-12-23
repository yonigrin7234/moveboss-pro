import Link from 'next/link';
import {
  FeatureCard,
  WhatsAppIcon,
  BrainIcon,
  ShieldIcon,
  TruckIcon,
  UsersIcon,
  RouteIcon,
  GridIcon,
  DollarIcon,
  GlobeIcon,
  PhoneIcon,
  MapPinIcon,
  PartnerIcon,
  FileTextIcon,
  SettingsIcon,
} from '@/components/marketing/feature-card';

export const metadata = {
  title: 'Features - MoveBoss Pro',
  description:
    'Explore all the features MoveBoss Pro offers for managing your moving operation.',
};

interface FeatureSection {
  title: string;
  description: string;
  features: {
    icon: React.ReactNode;
    title: string;
    description: string;
    highlight?: boolean;
    badge?: string;
  }[];
}

const featureSections: FeatureSection[] = [
  {
    title: 'Communication',
    description: 'Stay connected with your team and partners.',
    features: [
      {
        icon: <WhatsAppIcon />,
        title: 'WhatsApp Integration',
        description:
          'Auto-post loads to WhatsApp groups, send driver updates, and manage communications where your team already is.',
        highlight: true,
        badge: 'Unique',
      },
      {
        icon: <PartnerIcon />,
        title: 'Partner Network',
        description:
          'Connect with other carriers and brokers. Share loads with trusted partners and expand your network.',
      },
    ],
  },
  {
    title: 'Operations',
    description: 'Manage every aspect of your loads and trips.',
    features: [
      {
        icon: <GridIcon />,
        title: 'Load Management',
        description:
          'Create, track, and manage loads from quote to delivery. Full visibility into every shipment.',
      },
      {
        icon: <RouteIcon />,
        title: 'Trip Planning',
        description:
          'Build trips with multiple stops, optimize routes, and assign drivers and equipment.',
      },
      {
        icon: <MapPinIcon />,
        title: 'Smart Load Matching',
        description:
          'Get intelligent load suggestions based on driver location, capacity, and route preferences.',
      },
      {
        icon: <GlobeIcon />,
        title: 'Public Load Board',
        description:
          'Post available capacity to your public board. Let partners and customers find your trucks.',
      },
    ],
  },
  {
    title: 'Fleet & People',
    description: 'Manage your trucks, trailers, and team.',
    features: [
      {
        icon: <TruckIcon />,
        title: 'Fleet Management',
        description:
          'Track trucks and trailers. Manage maintenance schedules, equipment assignments, and availability.',
      },
      {
        icon: <PhoneIcon />,
        title: 'Driver Portal',
        description:
          'Mobile app for drivers with GPS tracking, digital documents, trip details, and real-time updates.',
      },
      {
        icon: <UsersIcon />,
        title: 'Crew Management',
        description:
          'Manage helpers and crew members. Track assignments, availability, and pay rates.',
      },
    ],
  },
  {
    title: 'Intelligence',
    description: 'Data and insights to run a profitable operation.',
    features: [
      {
        icon: <BrainIcon />,
        title: 'Financial Brain',
        description:
          'Automatic driver pay calculations based on pay mode. Profitability tracking and invoice generation.',
      },
      {
        icon: <DollarIcon />,
        title: 'Cost Tracking',
        description:
          'Track fuel, tolls, and expenses per trip. Know your true cost per mile and margins.',
      },
      {
        icon: <FileTextIcon />,
        title: 'Invoicing',
        description:
          'Generate professional invoices. Track payments and outstanding balances.',
      },
    ],
  },
  {
    title: 'Compliance',
    description: 'Stay compliant without the headache.',
    features: [
      {
        icon: <ShieldIcon />,
        title: 'FMCSA Monitoring',
        description:
          'Live DOT authority verification and monitoring. Get alerts when authority status changes.',
      },
      {
        icon: <FileTextIcon />,
        title: 'License Tracking',
        description:
          'Track driver licenses, medical cards, and certifications. Get expiration reminders.',
      },
      {
        icon: <SettingsIcon />,
        title: 'Document Management',
        description:
          'Store and organize BOLs, rate confirmations, and other documents. Access anywhere.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="py-20 px-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-6">Features</h1>
          <p className="text-lg text-white/50 leading-relaxed">
            Everything you need to manage loads, drivers, finances, and compliance — built for how
            moving companies actually work.
          </p>
        </div>
      </div>

      {/* Feature Sections */}
      <div className="max-w-6xl mx-auto space-y-24">
        {featureSections.map((section) => (
          <section key={section.title}>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-2">{section.title}</h2>
              <p className="text-white/50">{section.description}</p>
            </div>
            <div
              className={`grid gap-6 ${
                section.features.length === 2
                  ? 'md:grid-cols-2'
                  : section.features.length === 3
                  ? 'md:grid-cols-3'
                  : 'md:grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {section.features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  highlight={feature.highlight}
                  badge={feature.badge}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto mt-24 pt-16 border-t border-white/[0.06]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Ready to get started?</h2>
          <p className="text-white/50 mb-8">
            Set up your account and start managing your operation in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
            >
              Get started
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg border border-white/[0.08] transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
