'use client';

import { useState } from 'react';
import { PartnerCommunicationSettings } from '@/components/messaging/PartnerCommunicationSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building2, ChevronRight } from 'lucide-react';

interface PartnerInfo {
  id: string;
  name: string;
  type: string;
}

interface CommunicationSettingsClientProps {
  carrierCompanyId: string;
  partners: PartnerInfo[];
}

export function CommunicationSettingsClient({
  carrierCompanyId,
  partners,
}: CommunicationSettingsClientProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Partner list */}
      <div className="lg:col-span-1 space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          Select a partner ({partners.length})
        </h4>
        <div className="space-y-1">
          {partners.map((partner) => (
            <Button
              key={partner.id}
              variant="ghost"
              className={cn(
                'w-full justify-start h-auto py-3 px-3',
                selectedPartnerId === partner.id && 'bg-muted'
              )}
              onClick={() => setSelectedPartnerId(partner.id)}
            >
              <Building2 className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium truncate">{partner.name}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {partner.type}
                </Badge>
              </div>
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
                  selectedPartnerId === partner.id && 'rotate-90'
                )}
              />
            </Button>
          ))}
        </div>
      </div>

      {/* Settings panel */}
      <div className="lg:col-span-2">
        {selectedPartner ? (
          <PartnerCommunicationSettings
            carrierCompanyId={carrierCompanyId}
            partnerCompanyId={selectedPartner.id}
            partnerCompanyName={selectedPartner.name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/30">
            <Building2 className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Select a partner to view settings</p>
          </div>
        )}
      </div>
    </div>
  );
}
