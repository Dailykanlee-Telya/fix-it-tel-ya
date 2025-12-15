import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { ProtectedRoute as PermissionProtectedRoute } from "@/components/layout/ProtectedRoute";

// Layouts
import AppLayout from "@/components/layout/AppLayout";
import B2BLayout from "@/components/layout/B2BLayout";

// Pages
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Intake from "@/pages/Intake";
import Workshop from "@/pages/Workshop";
import Tickets from "@/pages/Tickets";
import TicketDetail from "@/pages/TicketDetail";
import Parts from "@/pages/Parts";
import Customers from "@/pages/Customers";
import Locations from "@/pages/Locations";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import TrackTicket from "@/pages/TrackTicket";
import UserManagement from "@/pages/UserManagement";
import PermissionSettings from "@/pages/PermissionSettings";
import DocumentTemplates from "@/pages/DocumentTemplates";
import B2BPartners from "@/pages/B2BPartners";
import B2BReturnShipments from "@/pages/B2BReturnShipments";
import B2BReturnShipmentNew from "@/pages/B2BReturnShipmentNew";
import B2BReturnShipmentDetail from "@/pages/B2BReturnShipmentDetail";
import NotFound from "@/pages/NotFound";
import Datenschutz from "@/pages/Datenschutz";
import B2BRegister from "@/pages/B2BRegister";

// B2B Pages
import B2BDashboard from "@/pages/b2b/B2BDashboard";
import B2BOrders from "@/pages/b2b/B2BOrders";
import B2BOrderNew from "@/pages/b2b/B2BOrderNew";
import B2BOrderDetail from "@/pages/b2b/B2BOrderDetail";
import B2BShipments from "@/pages/b2b/B2BShipments";
import B2BShipmentNew from "@/pages/b2b/B2BShipmentNew";
import B2BShipmentDetail from "@/pages/b2b/B2BShipmentDetail";

const queryClient = new QueryClient();

function AuthProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
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
          <Route path="document-templates" element={
            <PermissionProtectedRoute requiredPermission="MANAGE_DOCUMENT_TEMPLATES">
              <DocumentTemplates />
            </PermissionProtectedRoute>
          } />
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
