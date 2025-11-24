import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Friend } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const generateRandomId = () => Math.random().toString(36).substring(2, 9);
const generateRandomEmoji = () => {
  const emojis = ['👽', '👾', '🤖', '🎃', '💀', '👻', '🤡', '👺', '👹', '👿'];
  return emojis[Math.floor(Math.random() * emojis.length)];
};
const generateRandomColor = () => {
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useRealtimeFriends = (roomId: string = 'global') => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [me, setMe] = useState<Friend | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Initialize "Me" if not already
    const myId = localStorage.getItem('gyromorph_user_id') || generateRandomId();
    localStorage.setItem('gyromorph_user_id', myId);

    const myProfile: Friend = {
      id: myId,
      username: `User ${myId.substring(0, 4)}`,
      emoji: generateRandomEmoji(),
      color: generateRandomColor(),
      lastActive: Date.now(),
      status: 'idle'
    };

    setMe(myProfile);

    // Connect to Supabase
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: myId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Friend>();
        const onlineFriends: Friend[] = [];
        
        for (const id in state) {
            if (id !== myId) { // Don't include self in friends list
                // The state is an array of objects for that key (handling multi-device)
                // We just take the latest one
                const presence = state[id][0];
                onlineFriends.push(presence);
            }
        }
        setFriends(onlineFriends);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
           await channel.track(myProfile);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  // Function to update my status
  const updateStatus = async (newStatus: Friend['status']) => {
    if (channelRef.current && me) {
        const updatedMe = { ...me, status: newStatus, lastActive: Date.now() };
        setMe(updatedMe);
        await channelRef.current.track(updatedMe);
    }
  };

  return { friends, me, updateStatus };
};

