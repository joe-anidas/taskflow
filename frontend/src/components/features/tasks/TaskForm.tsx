import { useForm } from "react-hook-form";
import type { Task, TaskFormData } from "../../../types/task";
import { Button } from "../../ui/button";
import { TASK_VALIDATION, PRIORITY_LABELS } from "../../../constants/task";

interface TaskFormProps {
  task?: Task | null;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const TaskForm = ({
  task,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TaskFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: task
      ? {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority || "medium",
          dueDate: task.dueDate
            ? new Date(task.dueDate).toISOString().split("T")[0]
            : null,
        }
      : {
          title: "",
          description: "",
          status: "todo",
          priority: "medium",
          dueDate: null,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Title *
        </label>
        <input
          id="title"
          type="text"
          {...register("title", {
            required: "Title is required",
            minLength: {
              value: TASK_VALIDATION.TITLE_MIN_LENGTH,
              message: `Title must be at least ${TASK_VALIDATION.TITLE_MIN_LENGTH} characters`,
            },
            maxLength: {
              value: TASK_VALIDATION.TITLE_MAX_LENGTH,
              message: `Title cannot exceed ${TASK_VALIDATION.TITLE_MAX_LENGTH} characters`,
            },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter task title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description *
        </label>
        <textarea
          id="description"
          rows={3}
          {...register("description", {
            required: "Description is required",
            minLength: {
              value: TASK_VALIDATION.DESCRIPTION_MIN_LENGTH,
              message: `Description must be at least ${TASK_VALIDATION.DESCRIPTION_MIN_LENGTH} characters`,
            },
            maxLength: {
              value: TASK_VALIDATION.DESCRIPTION_MAX_LENGTH,
              message: `Description cannot exceed ${TASK_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`,
            },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter task description"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Status *
        </label>
        <select
          id="status"
          {...register("status", { required: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Priority
          </label>
          <select
            id="priority"
            {...register("priority")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">{PRIORITY_LABELS.low}</option>
            <option value="medium">{PRIORITY_LABELS.medium}</option>
            <option value="high">{PRIORITY_LABELS.high}</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="dueDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Due Date
          </label>
          <input
            id="dueDate"
            type="date"
            {...register("dueDate")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "Saving..." : task ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );
};
