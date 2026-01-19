import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "planned" | "completed";
  taskCount: number;
}

interface ManageSprintsModalProps {
  onClose: () => void;
}

// Mock initial data
const INITIAL_SPRINTS: Sprint[] = [
  { id: "1", name: "Sprint 42", startDate: "2023-11-01", endDate: "2023-11-14", status: "completed", taskCount: 12 },
  { id: "2", name: "Sprint 43", startDate: "2023-11-15", endDate: "2023-11-29", status: "active", taskCount: 8 },
  { id: "3", name: "Sprint 44", startDate: "2023-12-01", endDate: "2023-12-14", status: "planned", taskCount: 0 },
];

export const ManageSprintsModal = ({ onClose }: ManageSprintsModalProps) => {
  const [sprints, setSprints] = useState<Sprint[]>(INITIAL_SPRINTS);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const handleAddSprint = () => {
    if (!newName || !newStart || !newEnd) return;
    const newSprint: Sprint = {
      id: Math.random().toString(),
      name: newName,
      startDate: newStart,
      endDate: newEnd,
      status: "planned",
      taskCount: 0,
    };
    setSprints([...sprints, newSprint]);
    setNewName("");
    setNewStart("");
    setNewEnd("");
  };

  const handleDelete = (id: string) => {
    setSprints(sprints.filter(s => s.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Manage Sprints</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Create New Sprint Section */}
          <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
             <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Create New Sprint</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Sprint Name</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Sprint 45" 
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" 
                  />
               </div>
               <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Start Date</label>
                  <input 
                    type="date"
                    value={newStart} 
                    onChange={e => setNewStart(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" 
                  />
               </div>
               <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">End Date</label>
                  <input 
                    type="date" 
                    value={newEnd} 
                    onChange={e => setNewEnd(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" 
                  />
               </div>
             </div>
             <div className="flex justify-end">
               <Button onClick={handleAddSprint} disabled={!newName || !newStart || !newEnd} className="bg-blue-600 hover:bg-blue-700 text-white">
                 Add Sprint
               </Button>
             </div>
          </div>

          {/* List Sprints */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Existing Sprints</h3>
            <div className="flex flex-col gap-3">
              {sprints.map((sprint) => (
                <div key={sprint.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                       <span className="font-semibold text-gray-900">{sprint.name}</span>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                         sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                         sprint.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                       }`}>
                         {sprint.status}
                       </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>{new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>{sprint.taskCount} tasks</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                     <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                     </button>
                     <button onClick={() => handleDelete(sprint.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl">
           <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-700 hover:bg-white bg-white">
             Cancel
           </Button>
           <Button onClick={onClose} className="bg-gray-900 text-white hover:bg-gray-800">
             Save Changes
           </Button>
        </div>
      </div>
    </div>
  );
};
