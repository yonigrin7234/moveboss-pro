import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { loadId, driverId, truckId, trailerId } = body;

    if (!loadId || !driverId) {
      return NextResponse.json(
        { error: 'Load ID and Driver ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify ownership of load
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select('id, owner_id, status')
      .eq('id', loadId)
      .eq('owner_id', user.id)
      .single();

    if (loadError || !load) {
      return NextResponse.json(
        { error: 'Load not found or not owned by you' },
        { status: 404 }
      );
    }

    // Verify ownership of driver
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, owner_id, first_name, last_name')
      .eq('id', driverId)
      .eq('owner_id', user.id)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Driver not found or not owned by you' },
        { status: 404 }
      );
    }

    // Update the load with driver assignment
    const updateData: Record<string, unknown> = {
      assigned_driver_id: driverId,
      status: 'assigned',
    };

    if (truckId) {
      updateData.assigned_truck_id = truckId;
    }
    if (trailerId) {
      updateData.assigned_trailer_id = trailerId;
    }

    const { error: updateError } = await supabase
      .from('loads')
      .update(updateData)
      .eq('id', loadId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Load assigned to ${driver.first_name} ${driver.last_name}`,
    });
  } catch (error) {
    console.error('Error assigning load:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign load' },
      { status: 500 }
    );
  }
}
