'use server';

import { getCurrentUser } from '@/lib/supabase-server';
import {
  setUserRole,
  updateOnboardingStep,
  completeOnboarding,
  createCompanyForUser,
  createDriverProfile,
  createTruck,
  useInviteCode,
  validateInviteCode,
  type UserRole,
  type CreateCompanyData,
  type CreateDriverData,
  type CreateTruckData,
} from '@/data/onboarding';
import { revalidatePath } from 'next/cache';

// ============================================
// SET ROLE ACTION
// ============================================

export async function setRoleAction(
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const success = await setUserRole(user.id, role);

  if (success) {
    revalidatePath('/onboarding');
  }

  return { success };
}

// ============================================
// UPDATE STEP ACTION
// ============================================

export async function updateStepAction(
  step: number,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const success = await updateOnboardingStep(user.id, step, data);
  return { success };
}

// ============================================
// COMPANY SETUP ACTION
// ============================================

export async function setupCompanyAction(
  data: CreateCompanyData
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const result = await createCompanyForUser(user.id, data);

  if (result.success) {
    await completeOnboarding(user.id);
    revalidatePath('/onboarding');
  }

  return result;
}

// ============================================
// CARRIER SETUP ACTION
// ============================================

export async function setupCarrierAction(
  companyData: CreateCompanyData,
  truckData?: CreateTruckData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Create company
  const companyResult = await createCompanyForUser(user.id, companyData);
  if (!companyResult.success) {
    return { success: false, error: companyResult.error };
  }

  // Create truck if provided
  if (truckData) {
    const truckResult = await createTruck(user.id, truckData);
    if (!truckResult.success) {
      return { success: false, error: truckResult.error };
    }
  }

  await completeOnboarding(user.id);
  revalidatePath('/onboarding');

  return { success: true };
}

// ============================================
// OWNER-OPERATOR SETUP ACTION
// ============================================

export async function setupOwnerOperatorAction(
  companyData: CreateCompanyData,
  driverData: CreateDriverData,
  truckData: CreateTruckData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Create company (carrier)
  const companyResult = await createCompanyForUser(user.id, companyData);
  if (!companyResult.success) {
    return { success: false, error: companyResult.error };
  }

  // Create driver profile (themselves)
  const driverResult = await createDriverProfile(user.id, driverData);
  if (!driverResult.success) {
    return { success: false, error: driverResult.error };
  }

  // Create truck
  const truckResult = await createTruck(user.id, truckData);
  if (!truckResult.success) {
    return { success: false, error: truckResult.error };
  }

  await completeOnboarding(user.id);
  revalidatePath('/onboarding');

  return { success: true };
}

// ============================================
// DRIVER SETUP ACTION
// ============================================

export async function setupDriverAction(
  inviteCode: string,
  driverData: CreateDriverData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate invite code
  const validation = await validateInviteCode(inviteCode);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Create driver profile under the carrier
  const driverResult = await createDriverProfile(validation.carrierId!, driverData);
  if (!driverResult.success) {
    return { success: false, error: driverResult.error };
  }

  // Mark invite code as used
  await useInviteCode(inviteCode);

  await completeOnboarding(user.id);
  revalidatePath('/onboarding');

  return { success: true };
}

// ============================================
// VALIDATE INVITE CODE ACTION
// ============================================

export async function validateInviteCodeAction(
  code: string
): Promise<{ valid: boolean; carrierName?: string; error?: string }> {
  const result = await validateInviteCode(code);
  return {
    valid: result.valid,
    carrierName: result.carrierName,
    error: result.error,
  };
}
