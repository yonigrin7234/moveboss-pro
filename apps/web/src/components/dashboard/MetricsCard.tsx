interface MetricsCardProps {
  title: string;
  value: string | number;
}

export function MetricsCard({ title, value }: MetricsCardProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

