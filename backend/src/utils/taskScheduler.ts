import Task from "../models/Task";
import { notificationService } from "../notification";

/**
 * Check for overdue and due soon tasks and send notifications
 * This can be run as a scheduled job (e.g., with node-cron)
 */
export async function checkTaskDueDates() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Find overdue tasks
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: { $ne: "completed" },
    }).exec();

    // Find tasks due within 24 hours
    const dueSoonTasks = await Task.find({
      dueDate: {
        $gte: now,
        $lte: tomorrow,
      },
      status: { $ne: "completed" },
    }).exec();

    // Send overdue notifications
    for (const task of overdueTasks) {
      const daysOverdue = Math.floor(
        (now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24)
      );

      await notificationService.sendToUser({
        userId: task.userId.toString(),
        tenantId: task.tenantId.toString(),
        type: "task_overdue",
        title: "Task Overdue",
        message: `Task "${task.title}" is ${daysOverdue} day(s) overdue`,
        taskId: task._id.toString(),
        metadata: { daysOverdue, dueDate: task.dueDate },
      });
    }

    // Send due soon notifications
    for (const task of dueSoonTasks) {
      const hoursUntilDue = Math.floor(
        (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      await notificationService.sendToUser({
        userId: task.userId.toString(),
        tenantId: task.tenantId.toString(),
        type: "task_due_soon",
        title: "Task Due Soon",
        message: `Task "${task.title}" is due in ${hoursUntilDue} hour(s)`,
        taskId: task._id.toString(),
        metadata: { hoursUntilDue, dueDate: task.dueDate },
      });
    }

    console.log(
      `📅 Due date check complete: ${overdueTasks.length} overdue, ${dueSoonTasks.length} due soon`
    );

    return {
      overdue: overdueTasks.length,
      dueSoon: dueSoonTasks.length,
    };
  } catch (error) {
    console.error("Error checking task due dates:", error);
    throw error;
  }
}

/**
 * Schedule the due date check to run daily
 * Uncomment and import node-cron if you want automated scheduling
 */
// import cron from 'node-cron';
// export function scheduleDueDateChecks() {
//   // Run every day at 9 AM
//   cron.schedule('0 9 * * *', async () => {
//     console.log('⏰ Running scheduled due date check...');
//     await checkTaskDueDates();
//   });
//   console.log('✅ Due date checks scheduled');
// }
