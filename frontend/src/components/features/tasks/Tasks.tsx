import { useState, useEffect, useMemo, useRef } from "react";
import type { Task, TaskFormData, TaskStatus, TaskPriority } from "@/types/task";
import { useTasks } from "@/hooks";
import { TaskBoard } from "./TaskBoard";
import { TaskForm } from "./TaskForm";
import { SummaryCards } from "./SummaryCards";
import { TimelineView } from "./TimelineView";
import { ManageSprintsModal } from "./ManageSprintsModal";
import { AssignTaskModal } from "../../dashboard/modals/AssignTaskModal";
import { Loader, ErrorMessage } from "@/components/common";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/store";
import type { User } from "@/types/user";

interface AssignTaskForm {
  title: string;
  description: string;
  userId: string;
  status?: TaskStatus;
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
}

export const Tasks = () => {
  const { user } = useAuthStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [orgName, setOrgName] = useState("");
  const [activeTab] = useState<"own" | "assigned">("own");

  // Local Filters
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [priorityFilter] = useState<TaskPriority | "all">("all");
  const [dueDateFilter] = useState<string>(""); // "" means all

  const {
    tasks,
    setSearch,
    isLoading,
    isError,
    error,
    createTask,
    updateTask,
    deleteTask,
    isCreating,
    isUpdating,
  } = useTasks({
    userId: user?.id,
    tenantId: user?.tenantId ?? null,
    role: user?.role,
  });

  useEffect(() => {
    if (user?.role === "user" && user.tenantId) {
      const fetchOrgName = async () => {
        try {
           const { httpClient } = await import("@/lib/httpClient");
           const { API_ENDPOINTS } = await import("@/config/api");
           const response = await httpClient.get<{ organization?: { name: string } }>(API_ENDPOINTS.AUTH.ORGANIZATION);
           if (response.organization?.name) {
             setOrgName(response.organization.name);
           }
        } catch (err) {
           console.error("Failed to fetch org name", err);
        }
      };
      void fetchOrgName();
    }
  }, [user]);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const ownTasks = tasks.filter(
    (task) => task.createdBy === user?.id || !task.createdBy
  );
  const assignedTasks = tasks.filter(
    (task) => task.userId === user?.id && task.createdBy !== user?.id
  );

  const baseTasks = activeTab === "own" ? ownTasks : assignedTasks;

  // Apply Priority and DueDate filters (Client-Side)
  const filteredTasks = useMemo(() => {
    return baseTasks.filter((task) => {
      // Priority
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      
      // Due Date
      if (dueDateFilter) {
         if (!task.dueDate) return false;
         // Compare YYYY-MM-DD
         const taskDate = new Date(task.dueDate).toISOString().split("T")[0];
         return taskDate === dueDateFilter;
      }

      return true;
    });
  }, [baseTasks, priorityFilter, dueDateFilter]);

  const handleAddTask = (status?: TaskStatus) => {
    setEditingTask(null);
    setDefaultStatus(status || "todo");
    setIsFormOpen(true);
  };

  const handleSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(
        { id: editingTask.id, data },
        {
          onSuccess: () => {
            setEditingTask(null);
            setIsFormOpen(false);
          },
        }
      );
    } else {
      createTask(
        {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate,
        },
        {
          onSuccess: () => {
            setIsFormOpen(false);
          },
        }
      );
    }
  };

  const handleEdit = (task: Task) => {
    // Only allow editing own tasks
    if (task.createdBy && task.createdBy !== user?.id) {
      alert(
        "You can only edit tasks you created. Assigned tasks are read-only."
      );
      return;
    }
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    // Only allow deleting own tasks
    if (task?.createdBy && task.createdBy !== user?.id) {
      alert("You can only delete tasks you created.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTask(id);
    }
  };

  const handleCancel = () => {
    setEditingTask(null);
    setIsFormOpen(false);
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    updateTask({ id, data: { status } });
  };
  
  const [view, setView] = useState<"kanban" | "timeline">("kanban");
  const [isSprintsOpen, setIsSprintsOpen] = useState(false);

  // Assign Task States
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    if (user?.role === "tenantAdmin") {
      const loadUsers = async () => {
        try {
          const { httpClient } = await import("@/lib/httpClient");
          const { API_ENDPOINTS } = await import("@/config/api");
          
          const data = await httpClient.get<{ users?: User[] }>(
             API_ENDPOINTS.AUTH.USERS
          );
          if (data.users && user?.tenantId) {
             setUsersList(data.users.filter(u => u.tenantId === user.tenantId));
          } else {
             setUsersList([]);
          }
        } catch (err) {
          console.error("Failed to load users for assignment", err);
        }
      };
      void loadUsers();
    }
  }, [user]);

  const handleAssignTask = async (data: AssignTaskForm) => {
    setAssignLoading(true);
    setAssignError(null);
    try {
      const { taskService } = await import("@/services/api/taskService");
      
      const selectedUser = usersList.find(
        (u) => u.id === data.userId || u._id === data.userId
      );
      if (!selectedUser) throw new Error("Selected user not found");

      if (selectedUser.tenantId !== user?.tenantId) {
        throw new Error("Cannot assign tasks to users outside your tenant");
      }

      await taskService.createTask({
        title: data.title,
        description: data.description,
        userId: selectedUser.id || selectedUser._id,
        tenantId: user?.tenantId || undefined,
        status: data.status || "todo",
        priority: data.priority || "medium",
        dueDate: data.dueDate || null,
      });

      setAssignSuccess(`Task "${data.title}" assigned successfully!`);
      setShowAssignTask(false);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign task");
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500 min-h-screen flex flex-col font-sans">
       
       {/* User Dashboard Header */}
       {user?.role === "user" && (
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">User Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Task Tracker</h1>
            {orgName && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="bg-gray-50 px-2 py-1 rounded border border-gray-200 shadow-sm text-gray-700 font-medium">
                  {orgName}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-white text-blue-700 shadow-sm ring-1 ring-black/5 transition-all cursor-default">
              Task Tracker
            </button>
          </div>
        </header>
       )}

       {/* Top Dashboard Header (Sprint & Actions) */}
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
           {/* Left Side: Sprint Selector */}
           <div className="relative group">
              <select 
                className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium shadow-sm appearance-none hover:bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
                defaultValue="Sprint 1"
              >
                <option>Sprint 1</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-blue-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
           </div>

           {/* Right Side: Action Buttons */}
           <div className="flex items-center gap-3">
             {user?.role === "tenantAdmin" && (
                <Button 
                   variant="outline"
                   onClick={() => setShowAssignTask(true)}
                   className="h-11 px-5 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-medium shadow-sm"
                >
                   Assign Task
                </Button>
             )}
             {user?.role !== "user" && (
                 <Button 
                   variant="outline"
                   disabled
                   className="h-11 px-5 rounded-xl border-gray-200 text-gray-400 font-medium shadow-sm cursor-not-allowed hover:bg-transparent"
                 >
                   Manage Sprints
                 </Button>
             )}
             <Button
               onClick={() => handleAddTask()}
               className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-200 transition-all hover:scale-105"
             >
               + New Task
             </Button>
          </div>
       </div>

       {/* Summary Cards */}
       <SummaryCards tasks={tasks} />

       {/* View Switcher and Filters */}
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-100 pb-2">
    
          <div className="flex p-1 bg-gray-100/80 rounded-lg self-start">
             <button
               onClick={() => setView("kanban")}
               className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                 view === "kanban" 
                   ? "bg-white text-gray-900 shadow-sm" 
                   : "text-gray-500 hover:text-gray-700"
               }`}
             >
               Kanban Board
             </button>
             <button
               disabled
               className="px-6 py-2 rounded-md text-sm font-semibold text-gray-400 cursor-not-allowed"
             >
               Timeline
             </button>
          </div>
          
          <div className="flex-1"></div>

          {/* Right Side Filters (Keep existing logic but styled cleaner) */}
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="w-full pl-4 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             {/* Simple visual filter button for now to match cleaner look */}
             <button 
               onClick={() => setShowFilters(!showFilters)}
               className={`p-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
             </button>
             {showFilters && (
                <div className="absolute top-full right-0 mt-2 bg-white ....">
                  {/* Reuse existing filter dropdown content logic here or keep it hidden for this mockup phase if too complex to inline again */}
                </div>
             )}
          </div>
       </div>

       {/* Content Area */}
       <div className="flex-1 min-h-0 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
              <Loader />
            </div>
          ) : isError ? (
             <div className="p-4"><ErrorMessage message={error || "Failed to load tasks."} /></div>
          ) : (
             view === "kanban" ? (
               <TaskBoard
                 tasks={filteredTasks}
                 onEdit={handleEdit}
                 onDelete={handleDelete}
                 onStatusChange={handleStatusChange}
                 onAddTask={handleAddTask}
               />
             ) : (
               <TimelineView tasks={filteredTasks} />
             )
          )}
       </div>

       {/* Modals */}
       {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
              <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingTask ? "Edit Task" : "Create New Task"}
                  </h3>
                  <button onClick={handleCancel} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                  <TaskForm
                    task={editingTask}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isSubmitting={isCreating || isUpdating}
                    defaultStatus={defaultStatus}
                  />
                </div>
              </div>
          </div>
       )}

       {isSprintsOpen && (
          <ManageSprintsModal onClose={() => setIsSprintsOpen(false)} />
       )}

       <AssignTaskModal
          isOpen={showAssignTask}
          onClose={() => { setShowAssignTask(false); setAssignError(null); }}
          users={usersList}
          onSubmit={handleAssignTask}
          isLoading={assignLoading}
          error={assignError}
       />

       {assignSuccess && (
          <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300 z-50">
             <span>{assignSuccess}</span>
             <button onClick={() => setAssignSuccess(null)} className="hover:bg-green-600 rounded-full p-1 transition-colors">✕</button>
          </div>
       )}
    </div>
  );
};
