import type { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";

interface TaskBoardProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export const TaskBoard = ({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskBoardProps) => {
  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: "todo", title: "To Do", color: "bg-gray-100/50" },
    { id: "in-progress", title: "In Progress", color: "bg-blue-50/50" },
    { id: "in-review", title: "In Review", color: "bg-purple-50/50" },
    { id: "completed", title: "Completed", color: "bg-green-50/50" },
  ];

  return (
    <div className="flex flex-col md:grid md:grid-cols-4 gap-6 h-full md:overflow-x-auto pb-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        
        return (
          <div key={col.id} className={`flex flex-col min-h-[500px] md:h-full rounded-2xl ${col.color} p-4 border border-gray-200/60`}>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                 <h3 className="font-bold text-gray-700">{col.title}</h3>
                 <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                   {colTasks.length}
                 </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
               {colTasks.length === 0 ? (
                 <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                    <p className="text-gray-400 text-xs font-medium">Empty</p>
                 </div>
               ) : (
                 colTasks.map((task) => (
                   <TaskCard
                     key={task.id}
                     task={task}
                     onEdit={onEdit}
                     onDelete={onDelete}
                     onStatusChange={onStatusChange}
                   />
                 ))
               )}
            </div>
            
            <button className="mt-3 flex items-center justify-center w-full py-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all text-sm font-medium">
               + Add Task
            </button>
          </div>
        );
      })}
    </div>
  );
};
