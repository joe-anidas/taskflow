import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { Navbar } from "@/components/common";
import { httpClient } from "@/lib/httpClient";
import { API_ENDPOINTS } from "@/config/api";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { UserManagement } from "@/components/dashboard/users/UserManagement";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const isTenantAdmin = user?.role === "tenantAdmin";
  const ORG_NAME_KEY = "org-name-display";
  
  const [activeView, setActiveView] = useState<"overview" | "users">(
    isSuperAdmin ? "users" : "overview"
  );
  
  const [orgName, setOrgName] = useState("Your Organization");

  const loadOrganization = async () => {
    try {
      const data = await httpClient.get<{
        organization?: { name: string } | null;
      }>(API_ENDPOINTS.AUTH.ORGANIZATION);
      const next = data.organization?.name || orgName;
      setOrgName(next);
      localStorage.setItem(ORG_NAME_KEY, next);
    } catch (err) {
      console.warn("Failed to fetch organization", err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role === "user") {
      navigate("/tasks", { replace: true });
    }
    const storedOrg = localStorage.getItem(ORG_NAME_KEY);
    if (storedOrg) {
      setOrgName(storedOrg);
    }
    void loadOrganization();
  }, [user, navigate]);

  const handleOrgSave = async (newName: string) => {
    const next = newName.trim() || "Your Organization";
    await httpClient.patch(API_ENDPOINTS.AUTH.ORGANIZATION, {
      name: next,
      tenantId: user?.tenantId,
    });
    setOrgName(next);
    localStorage.setItem(ORG_NAME_KEY, next);
  };

  if (!user || (!isSuperAdmin && !isTenantAdmin)) {
    return null;
  }

  const orgLabel = orgName || user?.tenantId || "Your Organization";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50/50 px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <DashboardHeader 
            isSuperAdmin={isSuperAdmin}
            isTenantAdmin={isTenantAdmin}
            activeView={activeView}
            setActiveView={setActiveView}
            orgName={orgName}
            onSaveOrgName={handleOrgSave}
            orgLabel={orgLabel}
          />

          {/* CONTENT AREA */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeView === "overview" && isTenantAdmin && (
              <AnalyticsDashboard />
            )}

            {activeView === "users" && (
              <UserManagement />
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default DashboardPage;
