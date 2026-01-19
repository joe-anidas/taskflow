import { useState, useEffect, useMemo, useRef } from "react";
import type { Task, TaskFormData, TaskStatus, TaskPriority } from "@/types/task";
import { useTasks } from "@/hooks";
import { TaskBoard } from "./TaskBoard";
import { TaskForm } from "./TaskForm";
import { SummaryCards } from "./SummaryCards";
import { TimelineView } from "./TimelineView";
import { ManageSprintsModal } from "./ManageSprintsModal";
import { Loader, ErrorMessage } from "@/components/common";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/store";
// import { httpClient } from "@/lib/httpClient";
// import { API_ENDPOINTS } from "@/config/api";

export const Tasks = () => {
  const { user } = useAuthStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // const [orgName, setOrgName] = useState<string | null>(null);
  const [activeTab] = useState<"own" | "assigned">("own");
// ...
  // const resetFilters = ...
  // const activeFiltersCount = ...
  
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

/*
  useEffect(() => {
    if (user?.role === "user" && user?.tenantId) {
      const loadOrganization = async () => {
        try {
          const data = await httpClient.get<{
            organization?: { name: string } | null;
          }>(API_ENDPOINTS.AUTH.ORGANIZATION);
          // setOrgName(data.organization?.name || null);
        } catch (err) {
          console.warn("Failed to fetch organization", err);
        }
      };
      void loadOrganization();
    }
  }, [user]);
*/

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
  
  /*
  const resetFilters = () => {
    setPriorityFilter("all");
    setDueDateFilter("");
    setSearch("");
  };

  const activeFiltersCount = (priorityFilter !== "all" ? 1 : 0) + (dueDateFilter ? 1 : 0);
  */

  const [view, setView] = useState<"kanban" | "timeline">("kanban");
  const [isSprintsOpen, setIsSprintsOpen] = useState(false);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen flex flex-col font-sans">
       {/* Top Dashboard Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Task Tracker</h1>
            <p className="text-gray-500 mt-1 font-medium">Manage tasks, sprints, and project timelines efficiently.</p>
          </div>
          <div className="flex items-center gap-3">
             <Button 
               variant="outline"
               onClick={() => setIsSprintsOpen(true)}
               className="h-11 px-5 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-medium shadow-sm"
             >
               Manage Sprints
             </Button>
             <Button
               onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
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
          {/* View Tabs */}
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
               onClick={() => setView("timeline")}
               className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                 view === "timeline" 
                   ? "bg-white text-gray-900 shadow-sm" 
                   : "text-gray-500 hover:text-gray-700"
               }`}
             >
               Timeline
             </button>
          </div>

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
                  />
                </div>
              </div>
          </div>
       )}

       {isSprintsOpen && (
          <ManageSprintsModal onClose={() => setIsSprintsOpen(false)} />
       )}
    </div>
  );
};
