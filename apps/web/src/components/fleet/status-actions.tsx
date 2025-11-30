'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Power, Archive, RefreshCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type EntityType = 'driver' | 'truck' | 'trailer';
type StatusAction = 'deactivate' | 'archive' | 'reactivate';

interface StatusActionsProps {
  entityType: EntityType;
  entityId: string;
  currentStatus: string;
  entityName: string; // For display in dialogs
  onSuccess?: () => void;
}

const actionConfig: Record<StatusAction, {
  label: string;
  description: (entityType: string, entityName: string) => string;
  icon: typeof Power;
  variant: 'default' | 'destructive';
  buttonClass?: string;
}> = {
  deactivate: {
    label: 'Deactivate',
    description: (entityType, entityName) =>
      `This will set ${entityName} to inactive. They won't appear in active lists but can be reactivated later.`,
    icon: Power,
    variant: 'default',
    buttonClass: 'text-yellow-600',
  },
  archive: {
    label: 'Archive',
    description: (entityType, entityName) =>
      `This will archive ${entityName}. Archived ${entityType}s are hidden from most views but can be restored if needed.`,
    icon: Archive,
    variant: 'destructive',
  },
  reactivate: {
    label: 'Reactivate',
    description: (entityType, entityName) =>
      `This will restore ${entityName} to active status.`,
    icon: RefreshCcw,
    variant: 'default',
    buttonClass: 'text-green-600',
  },
};

export function StatusActions({
  entityType,
  entityId,
  currentStatus,
  entityName,
  onSuccess,
}: StatusActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<StatusAction | null>(null);

  const handleAction = async (action: StatusAction) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fleet/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast({ description: data.message });
      setConfirmAction(null);
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Action failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine available actions based on current status
  const availableActions: StatusAction[] = [];

  if (currentStatus === 'active') {
    availableActions.push('deactivate', 'archive');
  } else if (currentStatus === 'inactive' || currentStatus === 'suspended' || currentStatus === 'maintenance') {
    availableActions.push('reactivate', 'archive');
  } else if (currentStatus === 'archived') {
    availableActions.push('reactivate');
  }

  if (availableActions.length === 0) {
    return null;
  }

  const config = confirmAction ? actionConfig[confirmAction] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableActions.includes('deactivate') && (
            <DropdownMenuItem
              onClick={() => setConfirmAction('deactivate')}
              className="text-yellow-600"
            >
              <Power className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          )}
          {availableActions.includes('reactivate') && (
            <DropdownMenuItem
              onClick={() => setConfirmAction('reactivate')}
              className="text-green-600"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reactivate
            </DropdownMenuItem>
          )}
          {availableActions.includes('archive') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmAction('archive')}
                className="text-red-600"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {config?.label} {entityType.charAt(0).toUpperCase() + entityType.slice(1)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {config?.description(entityType, entityName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleAction(confirmAction)}
              disabled={isLoading}
              className={
                confirmAction === 'archive'
                  ? 'bg-red-600 hover:bg-red-700'
                  : confirmAction === 'reactivate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {config?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * A simpler button-style component for inline use (e.g., on detail pages)
 */
interface StatusActionButtonProps {
  entityType: EntityType;
  entityId: string;
  action: StatusAction;
  entityName: string;
  onSuccess?: () => void;
  className?: string;
}

export function StatusActionButton({
  entityType,
  entityId,
  action,
  entityName,
  onSuccess,
  className,
}: StatusActionButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const config = actionConfig[action];
  const Icon = config.icon;

  const handleAction = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fleet/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast({ description: data.message });
      setShowConfirm(false);
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Action failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className={className || config.buttonClass}
      >
        <Icon className="mr-2 h-4 w-4" />
        {config.label}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {config.label} {entityType.charAt(0).toUpperCase() + entityType.slice(1)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {config.description(entityType, entityName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isLoading}
              className={
                action === 'archive'
                  ? 'bg-red-600 hover:bg-red-700'
                  : action === 'reactivate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {config.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
