import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AuditLogViewer from '@/components/admin/AuditLogViewer';

export default function AuditLogs() {
  const { hasRole } = useAuth();

  // Only ADMIN can access
  if (!hasRole('ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit-Log</h1>
        <p className="text-muted-foreground">
          Protokoll aller sicherheitsrelevanten Systemaktionen
        </p>
      </div>

      <AuditLogViewer />
    </div>
  );
}
