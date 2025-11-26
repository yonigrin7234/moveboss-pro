import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Fuel, Route, Receipt, Image, ExternalLink } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { listTripExpenses, type ExpenseListItem } from '@/data/expenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const expenseTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  fuel: { label: 'Fuel', icon: Fuel, color: 'text-amber-500' },
  tolls: { label: 'Tolls', icon: Route, color: 'text-blue-500' },
  maintenance: { label: 'Maintenance', icon: CreditCard, color: 'text-purple-500' },
  other: { label: 'Other', icon: Receipt, color: 'text-gray-500' },
};

const paidByLabels: Record<string, string> = {
  driver_personal: 'Driver (Personal)',
  driver_cash: 'Driver (Cash)',
  company_card: 'Company Card',
  fuel_card: 'Fuel Card',
};

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let expenses: ExpenseListItem[] = [];
  let error: string | null = null;

  try {
    expenses = await listTripExpenses({ ownerId: user.id });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load expenses';
  }

  // Summary stats by type
  const fuelExpenses = expenses.filter((e) => e.expense_type === 'fuel');
  const tollExpenses = expenses.filter((e) => e.expense_type === 'tolls');
  const otherExpenses = expenses.filter(
    (e) => e.expense_type !== 'fuel' && e.expense_type !== 'tolls'
  );

  const totalFuel = fuelExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalTolls = tollExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOther = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = totalFuel + totalTolls + totalOther;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Expenses
        </h1>
        <p className="text-muted-foreground">
          Review all trip expenses
        </p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalAll)}</p>
            <p className="text-xs text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fuel
            </CardTitle>
            <Fuel className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalFuel)}</p>
            <p className="text-xs text-muted-foreground">
              {fuelExpenses.length} fill-up{fuelExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tolls
            </CardTitle>
            <Route className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalTolls)}</p>
            <p className="text-xs text-muted-foreground">
              {tollExpenses.length} toll{tollExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Other
            </CardTitle>
            <Receipt className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalOther)}</p>
            <p className="text-xs text-muted-foreground">
              {otherExpenses.length} expense{otherExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No expenses yet</p>
              <p className="text-sm">Expenses will appear here as drivers log them on trips</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const config = expenseTypeConfig[expense.expense_type || 'other'] || expenseTypeConfig.other;
                    const Icon = config.icon;
                    return (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            <span className="capitalize">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {expense.trip_id ? (
                            <Link
                              href={`/dashboard/trips/${expense.trip_id}`}
                              className="text-primary hover:underline"
                            >
                              {expense.trip_number || 'View Trip'}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {expense.driver_name || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {expense.paid_by ? paidByLabels[expense.paid_by] || expense.paid_by : '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          {expense.receipt_photo_url ? (
                            <a
                              href={expense.receipt_photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Image className="h-4 w-4" />
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(expense.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
