import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { ProtectedRoute as PermissionProtectedRoute } from "@/components/layout/ProtectedRoute";

// Layouts - lazy loaded to reduce initial bundle
const AppLayout = lazy(() => import("@/components/layout/AppLayout"));
const B2BLayout = lazy(() => import("@/components/layout/B2BLayout"));

// Eager loaded pages (critical path)
import Auth from "@/pages/Auth";
import TrackTicket from "@/pages/TrackTicket";

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Lazy loaded pages - main app
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Intake = lazy(() => import("@/pages/Intake"));
const Workshop = lazy(() => import("@/pages/Workshop"));
const Tickets = lazy(() => import("@/pages/Tickets"));
const TicketDetail = lazy(() => import("@/pages/TicketDetail"));
const Parts = lazy(() => import("@/pages/Parts"));
const Customers = lazy(() => import("@/pages/Customers"));
const Locations = lazy(() => import("@/pages/Locations"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const PermissionSettings = lazy(() => import("@/pages/PermissionSettings"));
// DocumentTemplates removed - documents are only managed within ticket context
const B2BPartners = lazy(() => import("@/pages/B2BPartners"));
const B2BReturnShipments = lazy(() => import("@/pages/B2BReturnShipments"));
const B2BReturnShipmentNew = lazy(() => import("@/pages/B2BReturnShipmentNew"));
const B2BReturnShipmentDetail = lazy(() => import("@/pages/B2BReturnShipmentDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Datenschutz = lazy(() => import("@/pages/Datenschutz"));
const B2BRegister = lazy(() => import("@/pages/B2BRegister"));

// Lazy loaded B2B pages
const B2BDashboard = lazy(() => import("@/pages/b2b/B2BDashboard"));
const B2BOrders = lazy(() => import("@/pages/b2b/B2BOrders"));
const B2BOrderNew = lazy(() => import("@/pages/b2b/B2BOrderNew"));
const B2BOrderDetail = lazy(() => import("@/pages/b2b/B2BOrderDetail"));
const B2BShipments = lazy(() => import("@/pages/b2b/B2BShipments"));
const B2BShipmentNew = lazy(() => import("@/pages/b2b/B2BShipmentNew"));
const B2BShipmentDetail = lazy(() => import("@/pages/b2b/B2BShipmentDetail"));

const queryClient = new QueryClient();

function AuthProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, signOut } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is approved
  if (isApproved === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Freigabe ausstehend</h1>
            <p className="text-muted-foreground mt-2">
              Ihr Konto wurde erstellt, muss aber noch von einem Administrator freigeschaltet werden.
            </p>
            <p className="text-muted-foreground mt-2">
              Bitte wenden Sie sich an Ihren Vorgesetzten oder warten Sie auf die Freigabe.
            </p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function SessionTimeoutManager() {
  const { showWarning, secondsRemaining, extendSession, logout } = useSessionTimeout();
  
  return (
    <SessionTimeoutWarning
      open={showWarning}
      secondsRemaining={secondsRemaining}
      onExtendSession={extendSession}
      onLogout={logout}
    />
  );
}

function AppRoutes() {
  return (
    <>
      <SessionTimeoutManager />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/track" element={<TrackTicket />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/b2b-register" element={<B2BRegister />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <AuthProtectedRoute>
                <AppLayout />
              </AuthProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={
              <PermissionProtectedRoute requiredPermission="VIEW_DASHBOARD">
                <Dashboard />
              </PermissionProtectedRoute>
            } />
            <Route path="intake" element={
              <PermissionProtectedRoute requiredPermission="VIEW_INTAKE">
                <Intake />
              </PermissionProtectedRoute>
            } />
            <Route path="workshop" element={
              <PermissionProtectedRoute requiredPermission="VIEW_WORKSHOP">
                <Workshop />
              </PermissionProtectedRoute>
            } />
            <Route path="tickets" element={
              <PermissionProtectedRoute requiredPermission="VIEW_TICKET_DETAILS">
                <Tickets />
              </PermissionProtectedRoute>
            } />
            <Route path="tickets/:id" element={
              <PermissionProtectedRoute requiredPermission="VIEW_TICKET_DETAILS">
                <TicketDetail />
              </PermissionProtectedRoute>
            } />
            <Route path="parts" element={
              <PermissionProtectedRoute requiredPermission="VIEW_PARTS">
                <Parts />
              </PermissionProtectedRoute>
            } />
            <Route path="customers" element={
              <PermissionProtectedRoute requiredPermission="VIEW_CUSTOMERS">
                <Customers />
              </PermissionProtectedRoute>
            } />
            <Route path="locations" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_SETTINGS">
                <Locations />
              </PermissionProtectedRoute>
            } />
            <Route path="reports" element={
              <PermissionProtectedRoute requiredPermission="VIEW_REPORTS">
                <Reports />
              </PermissionProtectedRoute>
            } />
            <Route path="settings" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_SETTINGS">
                <Settings />
              </PermissionProtectedRoute>
            } />
            <Route path="users" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_USERS">
                <UserManagement />
              </PermissionProtectedRoute>
            } />
            <Route path="permissions" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_PERMISSIONS">
                <PermissionSettings />
              </PermissionProtectedRoute>
            } />
            {/* DocumentTemplates route removed - documents only exist within ticket context */}
            <Route path="b2b-partners" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_B2B_PARTNERS">
                <B2BPartners />
              </PermissionProtectedRoute>
            } />
            <Route path="b2b-return-shipments" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_B2B_PARTNERS">
                <B2BReturnShipments />
              </PermissionProtectedRoute>
            } />
            <Route path="b2b-return-shipments/new" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_B2B_PARTNERS">
                <B2BReturnShipmentNew />
              </PermissionProtectedRoute>
            } />
            <Route path="b2b-return-shipments/:id" element={
              <PermissionProtectedRoute requiredPermission="MANAGE_B2B_PARTNERS">
                <B2BReturnShipmentDetail />
              </PermissionProtectedRoute>
            } />
          </Route>

          {/* B2B Portal routes */}
          <Route
            path="/b2b"
            element={
              <AuthProtectedRoute>
                <B2BLayout />
              </AuthProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/b2b/dashboard" replace />} />
            <Route path="dashboard" element={<B2BDashboard />} />
            <Route path="orders" element={<B2BOrders />} />
            <Route path="orders/new" element={<B2BOrderNew />} />
            <Route path="orders/:id" element={<B2BOrderDetail />} />
            <Route path="shipments" element={<B2BShipments />} />
            <Route path="shipments/new" element={<B2BShipmentNew />} />
            <Route path="shipments/:id" element={<B2BShipmentDetail />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
