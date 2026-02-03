import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationToastProps {
  notifications: NotificationItem[];
  removeNotification: (id: string) => void;
}

const NotificationItemComponent: React.FC<{ item: NotificationItem; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(item.id);
    }, 5000); // Auto dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-zinc-900',
          border: 'border-emerald-500/50',
          icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
          titleColor: 'text-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-zinc-900',
          border: 'border-red-500/50',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          titleColor: 'text-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-zinc-900',
          border: 'border-amber-500/50',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          titleColor: 'text-amber-500'
        };
      default:
        return {
          bg: 'bg-zinc-900',
          border: 'border-blue-500/50',
          icon: <Info className="w-5 h-5 text-blue-500" />,
          titleColor: 'text-blue-500'
        };
    }
  };

  const style = getStyles(item.type);

  return (
    <div className={`
      relative w-80 p-4 rounded-md border shadow-2xl flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-right-full fade-in
      ${style.bg} ${style.border}
    `}>
      <div className="flex-shrink-0 mt-0.5">
        {style.icon}
      </div>
      <div className="flex-1">
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${style.titleColor}`}>
          {item.type}
        </h4>
        <p className="text-sm text-zinc-300 leading-snug font-medium">
          {item.message}
        </p>
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 text-zinc-500 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        {notifications.map((item) => (
          <NotificationItemComponent 
            key={item.id} 
            item={item} 
            onRemove={removeNotification} 
          />
        ))}
      </div>
    </div>
  );
};