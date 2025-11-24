import React from 'react';
import { Friend } from '../types';

interface FriendOverlayProps {
  friends: Friend[];
  me: Friend | null;
  className?: string;
}

const FriendOverlay: React.FC<FriendOverlayProps> = ({ friends, me, className = '' }) => {
  if (!me && friends.length === 0) return null;

  return (
    <div className={`absolute top-4 right-4 z-50 flex flex-col items-end space-y-2 ${className}`}>
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-2 min-w-[120px]">
        <div className="text-[10px] uppercase text-gray-500 font-bold mb-2 tracking-wider flex justify-between items-center">
            <span>SQUAD ({friends.length + 1})</span>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </div>
        
        {/* Me */}
        {me && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 opacity-100">
            <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/20"
                style={{ backgroundColor: `${me.color}20`, borderColor: me.color }}
            >
                {me.emoji}
            </div>
            <div className="text-right">
                <div className="text-xs font-bold text-white">{me.username}</div>
                <div className="text-[8px] text-gray-400 uppercase">{me.status}</div>
            </div>
          </div>
        )}

        {/* Friends */}
        <div className="space-y-1 max-h-[200px] overflow-y-auto no-scrollbar">
          {friends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-end gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <div className="text-right">
                    <div className="text-xs font-medium text-gray-300">{friend.username}</div>
                    <div className="text-[8px] text-gray-500 uppercase">{friend.status}</div>
                </div>
                <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-white/10"
                    style={{ backgroundColor: `${friend.color}10`, borderColor: friend.color }}
                >
                    {friend.emoji}
                </div>
            </div>
          ))}
          
          {friends.length === 0 && (
            <div className="text-[10px] text-gray-600 text-center py-1 italic">
              Scanning for signals...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendOverlay;

