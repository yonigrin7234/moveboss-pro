import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-server';

export default async function DriverStatementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payables')
    .select(`id, amount, status, due_date, created_at, trip:trips(id, trip_number), driver:drivers(id, first_name, last_name)`)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load driver statements: ${error.message}`);
  }

  const rows = data || [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Statements</p>
        <h1 className="text-2xl font-bold">Driver Statements</h1>
        <p className="text-sm text-muted-foreground">Payables owed to drivers by trip.</p>
      </div>
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-left">
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                  No driver statements yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/40">
                <td className="px-4 py-3">
                  {(() => {
                    const driver = row.driver?.[0];
                    return driver ? `${driver.first_name} ${driver.last_name}` : '—';
                  })()}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const trip = row.trip?.[0];
                    return trip ? trip.trip_number : '—';
                  })()}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {typeof row.amount === 'number' ? `$${row.amount.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
