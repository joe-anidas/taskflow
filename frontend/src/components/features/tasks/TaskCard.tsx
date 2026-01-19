import type { Task } from "../../../types/task";
import { Button } from "../../ui/button";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "../../../constants/task";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskCard = ({ task, onEdit, onDelete }: TaskCardProps) => {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "completed";

  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const isToday = dueDateObj?.toDateString() === new Date().toDateString();
  const isSoon =
    dueDateObj &&
    dueDateObj.getTime() - new Date().getTime() <= 24 * 60 * 60 * 1000 &&
    !isOverdue &&
    !isToday;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${
        isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {task.title}
          </h3>
          <p className="text-gray-600 text-sm mb-3">{task.description}</p>
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                STATUS_COLORS[task.status]
              }`}
            >
              {STATUS_LABELS[task.status]}
            </span>
            {task.priority && (
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  PRIORITY_COLORS[task.priority]
                }`}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
            )}
            {isOverdue && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Overdue
              </span>
            )}
            {isToday && !isOverdue && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Due Today
              </span>
            )}
            {isSoon && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Due Soon
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
          {task.dueDate && (
            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => onEdit(task)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => onDelete(task.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
