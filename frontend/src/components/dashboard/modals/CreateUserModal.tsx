import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui";
import { ErrorMessage } from "@/components";
import { useEffect, useState } from "react";
import { httpClient } from "@/lib/httpClient";
import { API_ENDPOINTS } from "@/config/api";

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: "user" | "tenantAdmin" | "superadmin";
  tenantId?: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserForm) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isSuperAdmin?: boolean;
}

export const CreateUserModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
  isSuperAdmin = false,
}: CreateUserModalProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>();

  const [organizations, setOrganizations] = useState<{ id: string; name: string; hasTenantAdmin?: boolean }[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState("");

  const selectedRole = useWatch({ control, name: "role" });

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    if (newRole === "tenantAdmin") {
      const currentTenantId = getValues("tenantId");
      if (currentTenantId) {
        const currentOrg = organizations.find(o => o.id === currentTenantId);
        if (currentOrg?.hasTenantAdmin) {
           setValue("tenantId", undefined);
           setSelectedOrgName("");
           setSearchQuery("");
        }
      }
    }
  };

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If creating a tenant admin, exclude organizations that already have one
    if (selectedRole === "tenantAdmin" && org.hasTenantAdmin) {
      return false;
    }

    return matchesSearch;
  });

  useEffect(() => {
    if (isOpen && isSuperAdmin) {
      const fetchOrgs = async () => {
        setOrgsLoading(true);
        try {
          const { organizations } = await httpClient.get<{ organizations: { id: string; name: string; hasTenantAdmin?: boolean }[] }>(
             API_ENDPOINTS.AUTH.ALL_ORGANIZATIONS
          );
          setOrganizations(organizations || []);
        } catch (err) {
          console.error("Failed to load organizations", err);
        } finally {
          setOrgsLoading(false);
        }
      };
      
      void fetchOrgs();
    }
  }, [isOpen, isSuperAdmin]);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: CreateUserForm) => {
    await onSubmit(data);
    if (!error) {
      reset();
      setSearchQuery("");
      setSelectedOrgName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white shadow-xl border border-gray-200 rounded-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && <ErrorMessage message={error} />}
        
        <div className="flex gap-3 mb-4">
          <Button 
            type="button" 
            variant="outline" 
            className="text-xs h-8"
            onClick={() => {
              setValue("name", "Demo User");
              setValue("email", `user.${Date.now()}@test.com`);
              setValue("password", "password123");
              setValue("role", "user");
            }}
          >
            Demo User
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="text-xs h-8"
            onClick={() => {
              setValue("name", "Demo Admin");
              setValue("email", `admin.${Date.now()}@test.com`);
              setValue("password", "password123");
              setValue("role", "tenantAdmin", { shouldValidate: true });
              
              // Auto-select a valid organization for demo
              if (organizations.length > 0) {
                 const validOrg = organizations.find(o => !o.hasTenantAdmin);
                 if (validOrg) {
                    setValue("tenantId", validOrg.id, { shouldValidate: true });
                    setSelectedOrgName(validOrg.name);
                    setSearchQuery(validOrg.name);
                 } else {
                    // Fallback if all have admins
                    alert("All existing organizations already have a Tenant Admin. To create a new Tenant Admin, you must first create a new Organization.");
                 }
              }
            }}
          >
            Demo Tenant Admin
          </Button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              {...register("name", {
                required: "Name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
              })}
              id="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Enter full name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" },
              })}
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="user@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Enter password"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              {...register("role", { 
                required: "Role is required",
                onChange: handleRoleChange
              })}
              id="role"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Select a role</option>
              <option value="user">User</option>
              <option value="tenantAdmin">Tenant Admin</option>
            </select>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
          </div>

          {isSuperAdmin && (
            <div className="relative">
              <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              {/* Hidden input to hold the actual ID */}
              <input 
                type="hidden" 
                {...register("tenantId", { required: isSuperAdmin ? "Organization is required" : false })} 
              />
              
              <div className="relative">
                <input
                  type="text"
                  value={selectedOrgName || searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedOrgName(""); // Clear selection on type
                    setValue("tenantId", undefined); // Clear form value
                    setShowOrgDropdown(true);
                  }}
                  onFocus={() => setShowOrgDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder={orgsLoading ? "Loading organizations..." : "Type to search organization..."}
                  disabled={orgsLoading}
                  autoComplete="off"
                />
                {orgsLoading && (
                   <div className="absolute right-3 top-2.5">
                     <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                   </div>
                )}
              </div>

              {showOrgDropdown && searchQuery && !selectedOrgName && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredOrgs.length > 0 ? (
                    filteredOrgs.map((org) => (
                      <button
                        type="button"
                        key={org.id}
                        onClick={() => {
                          setValue("tenantId", org.id);
                          setSelectedOrgName(org.name);
                          setSearchQuery(org.name); // Set display to name
                          setShowOrgDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                      >
                        {org.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">No organizations found</div>
                  )}
                </div>
              )}
              {errors.tenantId && <p className="mt-1 text-sm text-red-600">{errors.tenantId.message}</p>}
            </div>
          )}

          <div className="flex gap-3 pt-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create User"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
