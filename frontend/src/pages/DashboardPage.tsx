import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { Navbar } from "@/components/common";
import { Button } from "@/components/ui";
import { useForm } from "react-hook-form";
import { ErrorMessage } from "@/components";
import { httpClient } from "@/lib/httpClient";
import { API_ENDPOINTS } from "@/config/api";
import { taskService } from "@/services/api/taskService";

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: "user" | "tenantAdmin" | "superadmin";
}

interface EditUserForm {
  name: string;
  email: string;
  role: "user" | "tenantAdmin" | "superadmin";
}

interface AssignTaskForm {
  title: string;
  description: string;
  userId: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
}

interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "user" | "tenantAdmin" | "superadmin";
  tenantId: string;
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const isTenantAdmin = user?.role === "tenantAdmin";
  const ORG_NAME_KEY = "org-name-display";
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Your Organization");
  const [orgInput, setOrgInput] = useState("");
  const [orgSaved, setOrgSaved] = useState(false);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [orgSaveError, setOrgSaveError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [taskAssignLoading, setTaskAssignLoading] = useState(false);
  const [taskAssignError, setTaskAssignError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>();

  const {
    register: registerEditField,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm<EditUserForm>();

  const {
    register: registerTaskField,
    handleSubmit: handleTaskSubmit,
    reset: resetTask,
    formState: { errors: taskErrors },
  } = useForm<AssignTaskForm>();

  const loadOrganization = async () => {
    try {
      const data = await httpClient.get<{
        organization?: { name: string } | null;
      }>(API_ENDPOINTS.AUTH.ORGANIZATION);
      const next = data.organization?.name || orgName;
      setOrgName(next);
      setOrgInput(next);
      localStorage.setItem(ORG_NAME_KEY, next);
    } catch (err) {
      console.warn("Failed to fetch organization", err);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await httpClient.get<{ users?: User[] }>(
        API_ENDPOINTS.AUTH.USERS
      );
      setUsers(data.users || []);
    } catch (err) {
      setUsersError(
        err instanceof Error ? err.message : "Failed to load users"
      );
    } finally {
      setUsersLoading(false);
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
      setOrgInput(storedOrg);
    } else {
      setOrgInput("Your Organization");
    }
    void loadOrganization();
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const onTaskAssignSubmit = async (data: AssignTaskForm) => {
    setTaskAssignLoading(true);
    setTaskAssignError(null);
    setSuccess(null);

    try {
      // Filter for tenant-specific users only
      const selectedUser = users.find(
        (u) => u.id === data.userId || u._id === data.userId
      );

      if (!selectedUser) {
        throw new Error("Selected user not found");
      }

      if (isTenantAdmin && selectedUser.tenantId !== user?.tenantId) {
        throw new Error("Cannot assign tasks to users outside your tenant");
      }

      await taskService.createTask({
        title: data.title,
        description: data.description,
        userId: selectedUser.id || selectedUser._id,
        tenantId: user?.tenantId,
        status: "todo",
        priority: data.priority || "medium",
        dueDate: data.dueDate || null,
      });

      setSuccess(
        `Task "${data.title}" assigned to ${selectedUser.name} successfully!`
      );
      resetTask();
      setShowAssignTask(false);
    } catch (err) {
      setTaskAssignError(
        err instanceof Error ? err.message : "Failed to assign task"
      );
    } finally {
      setTaskAssignLoading(false);
    }
  };

  const handleOrgSave = async () => {
    const next = orgInput.trim() || "Your Organization";
    setIsSavingOrg(true);
    setOrgSaveError(null);

    try {
      await httpClient.patch(API_ENDPOINTS.AUTH.ORGANIZATION, {
        name: next,
        tenantId: user?.tenantId,
      });
      setOrgName(next);
      localStorage.setItem(ORG_NAME_KEY, next);
      setOrgSaved(true);
      setIsEditingOrg(false);
      setTimeout(() => setOrgSaved(false), 2000);
    } catch (err) {
      setOrgSaveError(
        err instanceof Error ? err.message : "Failed to save organization"
      );
    } finally {
      setIsSavingOrg(false);
    }
  };

  const onSubmit = async (data: CreateUserForm) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await httpClient.post(API_ENDPOINTS.AUTH.CREATE_TENANT_USER, data);

      setSuccess(`User ${data.email} created successfully!`);
      reset();
      setShowCreateUser(false);
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditValue("name", userToEdit.name);
    setEditValue("email", userToEdit.email);
    setEditValue("role", userToEdit.role);
    setError(null);
    setSuccess(null);
  };

  const onEditSubmit = async (data: EditUserForm) => {
    if (!editingUser) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await httpClient.patch(
        API_ENDPOINTS.AUTH.UPDATE_USER(editingUser.id || editingUser._id || ""),
        data
      );

      setSuccess(`User ${data.email} updated successfully!`);
      resetEdit();
      setEditingUser(null);
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    setDeletingUserId(userId);
    setError(null);
    setSuccess(null);

    try {
      await httpClient.delete(API_ENDPOINTS.AUTH.DELETE_USER(userId));
      setSuccess("User deleted successfully!");
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (isSuperAdmin) return users;
    if (isTenantAdmin && user?.tenantId) {
      return users.filter((u) => u.tenantId === user.tenantId);
    }
    return [];
  }, [users, isSuperAdmin, isTenantAdmin, user?.tenantId]);

  if (!user || (!isSuperAdmin && !isTenantAdmin)) {
    return null;
  }

  const orgLabel = orgName || user?.tenantId || "Your Organization";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">Dashboard</p>
              <h1 className="text-3xl font-bold text-gray-900">
                {isSuperAdmin ? "User Management" : "Tenant Dashboard"}
              </h1>
              {!isSuperAdmin && (
                <div className="text-gray-600 mt-1 flex flex-wrap items-center gap-3">
                  <span>
                    Organization:{" "}
                    <span className="font-semibold text-gray-900">
                      {orgLabel}
                    </span>
                  </span>
                  {isEditingOrg && !isSuperAdmin ? (
                    <>
                      <input
                        value={orgInput}
                        onChange={(e) => setOrgInput(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter organization name"
                        disabled={isSavingOrg}
                      />
                      <Button
                        size="sm"
                        onClick={handleOrgSave}
                        disabled={isSavingOrg}
                      >
                        {isSavingOrg ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOrgInput(orgName);
                          setIsEditingOrg(false);
                          setOrgSaved(false);
                          setOrgSaveError(null);
                        }}
                        disabled={isSavingOrg}
                      >
                        Cancel
                      </Button>
                      {orgSaved && (
                        <span className="text-sm text-green-600">✓ Saved</span>
                      )}
                      {orgSaveError && (
                        <span className="text-sm text-red-600">
                          {orgSaveError}
                        </span>
                      )}
                    </>
                  ) : !isSuperAdmin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setOrgInput(orgName);
                        setIsEditingOrg(true);
                      }}
                    >
                      Edit
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate("/tasks")}>
                Task Management
              </Button>
              {isTenantAdmin && (
                <Button
                  onClick={() => setShowAssignTask(!showAssignTask)}
                  variant="outline"
                >
                  {showAssignTask ? "Cancel" : "Assign Task"}
                </Button>
              )}
              <Button
                onClick={() =>
                  isSuperAdmin
                    ? setShowCreateUser(!showCreateUser)
                    : setShowCreateUser(false)
                }
                disabled={!isSuperAdmin}
              >
                {showCreateUser && isSuperAdmin ? "Cancel" : "User Management"}
              </Button>
            </div>
          </header>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {showCreateUser && isSuperAdmin && (
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New User
              </h2>
              {error && <ErrorMessage message={error} />}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    {...registerField("name", {
                      required: "Name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                    id="name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    {...registerField("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    id="email"
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    {...registerField("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                    })}
                    id="password"
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    {...registerField("role", {
                      required: "Role is required",
                    })}
                    id="role"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a role</option>
                    <option value="user">User</option>
                    <option value="tenantAdmin">Tenant Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create User"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateUser(false);
                      reset();
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {showAssignTask && isTenantAdmin && (
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Assign Task to User
              </h2>
              {taskAssignError && <ErrorMessage message={taskAssignError} />}
              <form
                onSubmit={handleTaskSubmit(onTaskAssignSubmit)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="userId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Assign To
                  </label>
                  <select
                    {...registerTaskField("userId", {
                      required: "Please select a user",
                    })}
                    id="userId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a user</option>
                    {filteredUsers
                      .filter((u) => u.role === "user")
                      .map((u) => (
                        <option key={u.id || u._id} value={u.id || u._id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                  {taskErrors.userId && (
                    <p className="mt-1 text-sm text-red-600">
                      {taskErrors.userId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="taskTitle"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Task Title
                  </label>
                  <input
                    {...registerTaskField("title", {
                      required: "Task title is required",
                      minLength: {
                        value: 1,
                        message: "Task title cannot be empty",
                      },
                      maxLength: {
                        value: 200,
                        message: "Task title cannot exceed 200 characters",
                      },
                    })}
                    id="taskTitle"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter task title"
                  />
                  {taskErrors.title && (
                    <p className="mt-1 text-sm text-red-600">
                      {taskErrors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="taskDescription"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    {...registerTaskField("description", {
                      maxLength: {
                        value: 2000,
                        message: "Description cannot exceed 2000 characters",
                      },
                    })}
                    id="taskDescription"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter task description"
                  />
                  {taskErrors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {taskErrors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="taskPriority"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Priority
                    </label>
                    <select
                      {...registerTaskField("priority")}
                      id="taskPriority"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="taskDueDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Due Date (Optional)
                    </label>
                    <input
                      {...registerTaskField("dueDate")}
                      id="taskDueDate"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={taskAssignLoading}>
                    {taskAssignLoading ? "Assigning..." : "Assign Task"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAssignTask(false);
                      resetTask();
                      setTaskAssignError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {editingUser && (
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Edit User
              </h2>
              {error && <ErrorMessage message={error} />}
              <form
                onSubmit={handleEditSubmit(onEditSubmit)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="editName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    {...registerEditField("name", {
                      required: "Name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                    id="editName"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                  {editErrors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {editErrors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="editEmail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    {...registerEditField("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    id="editEmail"
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                  {editErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {editErrors.email.message}
                    </p>
                  )}
                </div>

                {isSuperAdmin && (
                  <div>
                    <label
                      htmlFor="editRole"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Role
                    </label>
                    <select
                      {...registerEditField("role", {
                        required: "Role is required",
                      })}
                      id="editRole"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="tenantAdmin">Tenant Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                    {editErrors.role && (
                      <p className="mt-1 text-sm text-red-600">
                        {editErrors.role.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update User"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingUser(null);
                      resetEdit();
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-10 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-1">Role</div>
              <div className="col-span-2">Actions</div>
            </div>
            <div className="divide-y divide-gray-200">
              {usersLoading && (
                <div className="px-6 py-4 text-sm text-gray-500">
                  Loading users...
                </div>
              )}
              {usersError && (
                <div className="px-6 py-4 text-sm text-red-600">
                  {usersError}
                </div>
              )}
              {!usersLoading && !usersError && filteredUsers.length === 0 && (
                <div className="px-6 py-4 text-sm text-gray-500">
                  No users found.
                </div>
              )}
              {!usersLoading &&
                !usersError &&
                filteredUsers.map((u) => {
                  const isCurrentUser = (u.id || u._id) === user?.id;
                  const canEdit =
                    isSuperAdmin || (isTenantAdmin && u.role === "user");
                  const canDelete = !isCurrentUser && canEdit;

                  return (
                    <div
                      key={u.id || u._id}
                      className="grid grid-cols-10 px-6 py-4 text-sm text-gray-900 items-center"
                    >
                      <div className="col-span-4 font-medium">{u.name}</div>
                      <div className="col-span-3 text-gray-700 truncate">
                        {u.email}
                      </div>
                      <div className="col-span-1">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {u.role}
                        </span>
                      </div>
                      <div className="col-span-2 flex gap-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(u)}
                            disabled={isLoading}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleDeleteUser(u.id || u._id || "")
                            }
                            disabled={deletingUserId === (u.id || u._id)}
                          >
                            {deletingUserId === (u.id || u._id)
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default DashboardPage;
