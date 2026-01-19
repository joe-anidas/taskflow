import type { Task } from "../../../types/task";
import { Button } from "../../ui/button";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "../../../constants/task";
import { useAuthStore } from "@/store";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;

  isAssignedTask?: boolean; // Legacy prop, we'll use user check now
}

export const TaskCard = ({
  task,
  onEdit,
  onDelete,
}: TaskCardProps) => {
  const { user } = useAuthStore();
  
  // Logic: 
  // - You own the task if you created it, OR if it's a legacy task (no createdBy).
  // - If you didn't create it but it's assigned to you, it's an "Admin Assigned" task.
  const isCreator = task.createdBy === user?.id || !task.createdBy;
  const isAssignedToMe = task.userId === user?.id;
  // It is only an "Admin Assigned" task if it has a creator AND that creator is not me
  const isAdminAssigned = isAssignedToMe && task.createdBy && task.createdBy !== user?.id;

  // Permissions
  const canEdit = isCreator; // Only creator can edit details
  const canDelete = isCreator; // Only creator can delete

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "completed";

  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  
  // Logic for Urgent: Due date is in the future but less than 48 hours away
  // AND not completed
  const isUrgent = 
    dueDateObj &&
    task.status !== "completed" &&
    !isOverdue &&
    (dueDateObj.getTime() - now.getTime() < 2 * 24 * 60 * 60 * 1000);

  return (
    <div
      className={`relative bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all duration-200 group flex flex-col ${
        isOverdue 
          ? "border-red-300 bg-red-50/50" 
          : isUrgent 
            ? "border-red-400 shadow-red-100 ring-1 ring-red-100" 
            : "border-gray-200"
      }`}
    >
      <div className="flex-1 space-y-2">
         <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 pr-12">
              {isAdminAssigned && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  Admin
                </span>
              )}
              {isUrgent && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse">
                  URGENT
                </span>
              )}
              {task.priority && (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-bold ${
                    PRIORITY_COLORS[task.priority]
                  }`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
              )}
            </div>
         </div>

        <div className="mt-1">
          <h3 className={`text-sm font-semibold text-gray-900 leading-snug break-words pr-2 ${task.status === "completed" ? "line-through text-gray-400" : ""}`}>
            {task.title}
          </h3>
          
          <p className="mt-1 text-xs text-gray-500 line-clamp-2 min-h-[1.25rem]">
            {task.description || <span className="text-gray-300 italic">No description</span>}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 mt-auto">

              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${STATUS_COLORS[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>

           
           {task.dueDate && (
             <span className={`text-[10px] font-medium flex items-center gap-1 ${
               isOverdue ? "text-red-600" : isUrgent ? "text-red-500" : "text-gray-400"
             }`}>
               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
             </span>
           )}
        </div>
      </div>

      {/* Absolute positioned actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-100">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              title="Edit Task"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </Button>
          )}
          
          {canDelete && (
             <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              title="Delete Task"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </Button>
          )}
      </div>
    </div>
  );
};
