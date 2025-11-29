import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-server';

export default async function ProfitReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select('id, trip_number, start_date, end_date, revenue_total, driver_pay_total, fuel_total, tolls_total, other_expenses_total, profit_total, truck:trucks(id, unit_number), driver:drivers(id, first_name, last_name)')
    .eq('owner_id', user.id)
    .order('start_date', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to load profit report: ${error.message}`);
  }

  const rows = data || [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Reports</p>
        <h1 className="text-2xl font-bold">Trip Profit Report</h1>
        <p className="text-sm text-muted-foreground">Revenue, costs, and profit by trip.</p>
      </div>
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-left">
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Truck</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Driver Pay</th>
              <th className="px-4 py-3">Expenses</th>
              <th className="px-4 py-3">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted-foreground" colSpan={7}>
                  No trips yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const expenses =
                (row.driver_pay_total || 0) + (row.fuel_total || 0) + (row.tolls_total || 0) + (row.other_expenses_total || 0);
              return (
                <tr key={row.id} className="border-b border-border/40">
                <td className="px-4 py-3 font-medium">{row.trip_number}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const driver = row.driver?.[0];
                    return driver
                      ? `${driver.first_name} ${driver.last_name}`
                      : '—';
                  })()}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const truck = row.truck?.[0];
                    return truck ? truck.unit_number : '—';
                  })()}
                </td>
                <td className="px-4 py-3">{row.revenue_total?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3">{row.driver_pay_total?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3">{expenses.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold">{row.profit_total?.toFixed(2) ?? '0.00'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
