export interface OfflineAction {
  id: string;
  type: 'post' | 'comment' | 'like' | 'dislike' | 'repost';
  payload: any;
  timestamp: number;
}

const STORAGE_KEY = 'offline_actions';

export const offlineService = {
  getActions: (): OfflineAction[] => {
    const actions = localStorage.getItem(STORAGE_KEY);
    return actions ? JSON.parse(actions) : [];
  },
  
  addAction: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const actions = offlineService.getActions();
    const newAction: OfflineAction = {
      ...action,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    actions.push(newAction);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  },
  
  clearActions: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
