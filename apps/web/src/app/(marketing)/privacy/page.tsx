export const metadata = {
  title: 'Privacy Policy - MoveBoss',
  description: 'Privacy Policy for MoveBoss Pro trucking management platform.',
};

export default function PrivacyPage() {
  return (
    <div className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-semibold text-white mb-4">Privacy Policy</h1>
        <p className="text-white/40 mb-12">Last updated: December 26, 2025</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              MoveBoss (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our trucking management platform, including our web
              application and mobile apps (collectively, the &quot;Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-white/90 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>
                <strong>Account Information:</strong> Name, email address, phone number, company
                name, role (driver, dispatcher, owner, etc.)
              </li>
              <li>
                <strong>Business Information:</strong> DOT number, MC number, company address,
                operating authority details
              </li>
              <li>
                <strong>Driver Information:</strong> CDL number, license state, vehicle
                assignments
              </li>
              <li>
                <strong>Financial Information:</strong> Payment details, bank account information
                for settlements, expense records
              </li>
              <li>
                <strong>Load and Trip Data:</strong> Pickup/delivery addresses, cargo details,
                customer information, pricing
              </li>
              <li>
                <strong>Communications:</strong> Messages sent through the platform, support
                inquiries
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white/90 mb-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>
                <strong>Location Data:</strong> GPS coordinates from driver mobile apps for
                route tracking, load matching, and fleet visibility. This includes background
                location when enabled by the user.
              </li>
              <li>
                <strong>Device Information:</strong> Device type, operating system, unique device
                identifiers, browser type
              </li>
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, time spent, click
                patterns
              </li>
              <li>
                <strong>Log Data:</strong> IP address, access times, error logs
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white/90 mb-3">2.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>FMCSA and DOT databases for compliance verification</li>
              <li>Payment processors for transaction data</li>
              <li>Partner carriers and brokers for load information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process loads, trips, and financial transactions</li>
              <li>Track driver locations for dispatching and fleet management</li>
              <li>Match loads with available capacity in the marketplace</li>
              <li>Monitor compliance with DOT and FMCSA regulations</li>
              <li>Send notifications about trips, loads, and account activity</li>
              <li>Provide customer support</li>
              <li>Generate reports and analytics for your business</li>
              <li>Detect and prevent fraud or unauthorized access</li>
              <li>Communicate about updates, features, and promotional offers</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Location Data</h2>
            <p className="mb-4">
              Location tracking is a core feature of our Service for fleet management. We want
              to be transparent about how we handle this sensitive data:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Purpose:</strong> Driver location is used for real-time fleet tracking,
                route optimization, proof of delivery, and finding nearby loads.
              </li>
              <li>
                <strong>Background Location:</strong> When enabled, location is collected even
                when the app is not actively in use. This allows dispatchers to see driver
                positions and improves load matching accuracy.
              </li>
              <li>
                <strong>Control:</strong> Drivers can disable location tracking in their device
                settings, though this may limit certain features.
              </li>
              <li>
                <strong>Access:</strong> Location data is visible to authorized users within
                your company (dispatchers, owners) and is used for marketplace features.
              </li>
              <li>
                <strong>Retention:</strong> Location history is retained for operational and
                compliance purposes as described in Section 7.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Information Sharing</h2>
            <p className="mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Your Company:</strong> Owners, dispatchers, and authorized team members
                within your organization
              </li>
              <li>
                <strong>Partner Network:</strong> Carriers and brokers when you participate in
                marketplace features (with your consent)
              </li>
              <li>
                <strong>Service Providers:</strong> Third parties who assist in operating our
                Service (hosting, payment processing, analytics)
              </li>
              <li>
                <strong>Customers:</strong> Limited tracking information may be shared with
                load customers for delivery visibility
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court order, or
                government request
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, acquisition,
                or sale of assets
              </li>
            </ul>
            <p className="mt-4">
              We do not sell your personal information to third parties for their marketing
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your
              information, including encryption in transit and at rest, secure authentication,
              access controls, and regular security assessments. However, no method of
              transmission over the Internet is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Data Retention</h2>
            <p className="mb-4">We retain your information for as long as:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your account is active</li>
              <li>Needed to provide you with the Service</li>
              <li>Required for legal, accounting, or compliance purposes</li>
              <li>Necessary to resolve disputes or enforce agreements</li>
            </ul>
            <p className="mt-4">
              Trip and load records are retained for at least 3 years for compliance purposes.
              Location data history is retained for 90 days for operational use, then archived.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Your Rights and Choices</h2>
            <p className="mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal retention requirements)</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent for optional processing</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@moveboss.com" className="text-sky-400 hover:text-sky-300">
                privacy@moveboss.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Push Notifications</h2>
            <p>
              We send push notifications for trip updates, load assignments, and important
              alerts. You can manage notification preferences in the app settings or disable
              them entirely through your device settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to maintain your session, remember
              preferences, and analyze usage patterns. You can control cookies through your
              browser settings, though disabling them may affect Service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under 18 years of age. We do not
              knowingly collect personal information from children. If you believe we have
              collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. California Privacy Rights</h2>
            <p>
              California residents have additional rights under the California Consumer Privacy
              Act (CCPA), including the right to know what personal information is collected,
              request deletion, and opt out of the sale of personal information. We do not sell
              personal information as defined by the CCPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. International Users</h2>
            <p>
              If you access the Service from outside the United States, your information may be
              transferred to, stored, and processed in the United States where our servers are
              located. By using the Service, you consent to this transfer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              material changes via email or through the Service. Your continued use after such
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">15. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or our data practices, contact us
              at:
            </p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <p className="text-white font-medium">MoveBoss Privacy Team</p>
              <p>
                Email:{' '}
                <a href="mailto:privacy@moveboss.com" className="text-sky-400 hover:text-sky-300">
                  privacy@moveboss.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
