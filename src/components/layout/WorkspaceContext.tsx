"use client";

import { createContext, useContext } from 'react';

type WorkspaceCompany = {
  id: string;
  name: string;
  dba_name?: string | null;
  status?: string | null;
  owner_id?: string;
};

type Membership = {
  id: string;
  company_id: string;
  role: string;
  is_primary: boolean;
  company?: WorkspaceCompany | null;
};

type WorkspaceContextValue = {
  user: { id: string; email?: string | null; fullName?: string | null } | null;
  workspaceCompany: WorkspaceCompany | null;
  memberships: Membership[];
};

const WorkspaceContext = createContext<WorkspaceContextValue>({
  user: null,
  workspaceCompany: null,
  memberships: [],
});

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
