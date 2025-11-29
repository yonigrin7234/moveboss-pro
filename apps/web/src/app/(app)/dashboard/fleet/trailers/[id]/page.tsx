import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getTrailerById, updateTrailer, deleteTrailer } from '@/data/fleet';
import { getDriversForUser } from '@/data/drivers';
import { TrailerForm } from '@/components/fleet/TrailerForm';
import { DeleteTrailerButton } from './delete-trailer-button';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

interface TrailerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TrailerDetailPage({ params }: TrailerDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const [trailer, drivers] = await Promise.all([
    getTrailerById(id, user.id),
    getDriversForUser(user.id),
  ]);

  if (!trailer) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Trailer Not Found</h1>
          <p className="text-muted-foreground">
            {"The trailer doesn't exist or you don't have permission."}
          </p>
        </div>
        <Link
          href="/dashboard/fleet"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Back to Fleet
        </Link>
      </div>
    );
  }

  async function updateTrailerAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { errors: { _form: 'Not authenticated' } };

    const fields = [
      'unit_number',
      'type',
      'plate_number',
      'plate_state',
      'vin',
      'make',
      'model',
      'year',
      'capacity_cuft',
      'side_doors_count',
      'registration_expiry',
      'inspection_expiry',
      'assigned_driver_id',
      'status',
      'notes',
    ];

    const rawData = extractFormValues(formData, fields);
    const cleanedData = cleanFormValues(rawData);

    // Handle empty assigned_driver_id
    if (cleanedData.assigned_driver_id === '') {
      cleanedData.assigned_driver_id = null;
    }

    try {
      const { updateTrailerInputSchema } = await import('@/data/fleet');
      const validated = updateTrailerInputSchema.parse(cleanedData);
      await updateTrailer(id, validated, user.id);
      redirect(`/dashboard/fleet/trailers/${id}`);
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        const errors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
        return { errors };
      }
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update trailer' } };
    }
  }

  async function deleteTrailerAction() {
    'use server';
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    await deleteTrailer(id, user.id);
    redirect('/dashboard/fleet');
  }

  const initialData = {
    unit_number: trailer.unit_number,
    type: trailer.type,
    plate_number: trailer.plate_number ?? undefined,
    plate_state: trailer.plate_state ?? undefined,
    vin: trailer.vin ?? undefined,
    make: trailer.make ?? undefined,
    model: trailer.model ?? undefined,
    year: trailer.year ?? undefined,
    capacity_cuft: trailer.capacity_cuft ?? undefined,
    side_doors_count: trailer.side_doors_count ?? undefined,
    registration_expiry: trailer.registration_expiry ?? undefined,
    inspection_expiry: trailer.inspection_expiry ?? undefined,
    assigned_driver_id: trailer.assigned_driver_id ?? undefined,
    status: trailer.status,
    notes: trailer.notes ?? undefined,
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Trailer {trailer.unit_number}</h1>
        </div>
        <div className="flex gap-4">
          <Link
            href="/dashboard/fleet"
            className="px-4 py-2 bg-card text-foreground border border-border rounded-md hover:bg-muted"
          >
            Back to Fleet
          </Link>
          <DeleteTrailerButton deleteAction={deleteTrailerAction} />
        </div>
      </div>
      <TrailerForm
        initialData={initialData}
        drivers={drivers}
        onSubmit={updateTrailerAction}
        submitLabel="Save changes"
      />
    </div>
  );
}
