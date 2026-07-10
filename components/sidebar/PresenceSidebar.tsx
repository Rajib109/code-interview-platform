'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceSidebarProps {
  roomId: string;
  userEmail: string;
}

interface PresenceState {
  email: string;
  online_at: string;
}

export default function PresenceSidebar({ roomId, userEmail }: PresenceSidebarProps) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Create a dedicated presence channel for this room
    const channel: RealtimeChannel = supabase.channel(`presence-${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        
        // presenceState returns an object where values are arrays of state objects
        // (because one user might have multiple tabs open). We flatten and deduplicate by email.
        const users = Object.values(state).flat();
        const uniqueUsers = Array.from(new Map(users.map(u => [u.email, u])).values());
        
        setOnlineUsers(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce this user to the room
          await channel.track({
            email: userEmail,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, userEmail, supabase]);

  return (
    <div className="w-full bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          In Room ({onlineUsers.length})
        </h2>
      </div>
      <ul className="flex-1 overflow-y-auto p-4 space-y-3">
        {onlineUsers.map((user) => (
          <li key={user.email} className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-slate-300 truncate">
              {user.email}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
