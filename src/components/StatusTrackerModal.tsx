import React from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { Status } from '../types';
import { cn } from '../utils';

interface StatusTrackerModalProps {
  currentStatus: Status;
  onClose: () => void;
  isAdmin: boolean;
  onUpdateStatus: (status: Status) => void;
}

const STATUS_STEPS: Status[] = [
  'New',
  'Acknowledged',
  'Investigating',
  'Dev In-Progress',
  'Resolved'
];

export function StatusTrackerModal({ currentStatus, onClose, isAdmin, onUpdateStatus }: StatusTrackerModalProps) {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus === 'Reopened' ? 'New' : currentStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-800">
          <h2 className="text-xl font-bold text-slate-100">Status Information</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative pl-6 space-y-8">
            <div className="absolute left-8 top-2 bottom-2 w-0.5 bg-slate-800 -z-10"></div>
            
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;
              
              return (
                <div key={step} className="flex items-start gap-4 relative">
                  <div className="absolute -left-6 top-1 bg-slate-900 p-1">
                    {isCompleted ? (
                      <CheckCircle2 className={cn("w-5 h-5", isCurrent ? "text-indigo-400" : "text-emerald-500")} />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-semibold text-base",
                      isCurrent ? "text-indigo-400" : isCompleted ? "text-slate-200" : "text-slate-500"
                    )}>
                      {step}
                    </h3>
                    {isCurrent && (
                      <p className="text-xs text-slate-400 mt-1">Current state of the issue.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Admin Actions</h3>
              <select 
                value={currentStatus}
                onChange={(e) => onUpdateStatus(e.target.value as Status)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="Reopened">Reopened</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
