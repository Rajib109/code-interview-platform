/**
 * useYjsSync — Custom hook that encapsulates the entire Yjs + Supabase
 * synchronization lifecycle (document creation, channel setup, awareness,
 * persistence).
 *
 * Returns refs and state needed by the editor components.
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import * as awarenessProtocol from 'y-protocols/awareness';
import type { editor } from 'monaco-editor';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fromBase64ToUint8Array, fromUint8ArrayToBase64 } from '@/lib/yjs-utils';

/** Generate a random hex color for the user's cursor. */
const getRandomColor = () =>
  '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

interface UseYjsSyncOptions {
  roomId: string;
  userEmail: string;
  isHost: boolean;
  onProblemChange?: (problemId: string) => void;
}

export interface YjsSyncState {
  activeProblemId: string;
  setActiveProblemId: (id: string) => void;
  handleEditorDidMount: (editorInstance: editor.IStandaloneCodeEditor) => void;
  handleProblemChange: (newProblemId: string, starterCode: string) => void;
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
}

export function useYjsSync({
  roomId,
  userEmail,
  isHost,
}: UseYjsSyncOptions): YjsSyncState {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const [activeProblemId, setActiveProblemId] = useState<string>('two-sum');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      channelRef.current?.unsubscribe();
      bindingRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  const handleEditorDidMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance;

      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;
      const type = ydoc.getText('monaco');
      const ymap = ydoc.getMap('metadata');

      // Observe synced problem changes from other users
      ymap.observe(() => {
        const syncedProblem = ymap.get('active_problem') as string;
        if (syncedProblem) {
          setActiveProblemId(syncedProblem);
        }
      });

      // --- 1. PERSISTENCE: FETCH INITIAL STATE ---
      supabase
        .from('rooms')
        .select('yjs_state')
        .eq('id', roomId)
        .single()
        .then(
          ({ data }) => {
            if (data?.yjs_state) {
              const binaryState = fromBase64ToUint8Array(data.yjs_state);
              Y.applyUpdate(ydoc, binaryState);
            }
          },
          (err) => console.error('Failed to fetch initial room state:', err)
        );

      // --- 2. AWARENESS (CURSORS) SETUP ---
      const awareness = new awarenessProtocol.Awareness(ydoc);
      const displayName = userEmail.split('@')[0];

      awareness.setLocalStateField('user', {
        name: displayName,
        color: getRandomColor(),
      });

      bindingRef.current = new MonacoBinding(
        type,
        editorInstance.getModel()!,
        new Set([editorInstance]),
        awareness
      );

      const channel = supabase.channel(`room-${roomId}`);
      channelRef.current = channel;

      // --- 3. DOCUMENT SYNC & BOOTSTRAPPING ---
      ydoc.on('update', (update: Uint8Array, origin: string) => {
        // A. Broadcast local keystrokes via Supabase Realtime
        if (origin !== 'supabase') {
          channel.send({
            type: 'broadcast',
            event: 'yjs-update',
            payload: { update: Array.from(update) },
          });
        }

        // B. PERSISTENCE: Debounced save to database
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
          try {
            const state = Y.encodeStateAsUpdate(ydoc);
            const base64State = fromUint8ArrayToBase64(state);

            await supabase
              .from('rooms')
              .update({ yjs_state: base64State })
              .eq('id', roomId);
          } catch (err) {
            console.error('Failed to persist state:', err);
          }
        }, 2000);
      });

      // Listen for incoming document updates
      channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        const remoteUpdate = new Uint8Array(payload.update);
        Y.applyUpdate(ydoc, remoteUpdate, 'supabase');
      });

      // The Handshake: When someone asks for state, send full local state
      channel.on('broadcast', { event: 'request-state' }, () => {
        const stateUpdate = Y.encodeStateAsUpdate(ydoc);
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(stateUpdate) },
        });
      });

      // --- 4. CURSOR SYNC ---
      awareness.on(
        'update',
        (
          { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
          origin: string
        ) => {
          if (origin !== 'supabase') {
            const changedClients = added.concat(updated, removed);
            const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
            channel.send({
              type: 'broadcast',
              event: 'awareness-update',
              payload: { update: Array.from(update) },
            });
          }
        }
      );

      channel.on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
        const update = new Uint8Array(payload.update);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, 'supabase');
      });

      // --- 5. CONNECTION INITIALIZATION ---
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'request-state',
          });
        }
      });
    },
    [roomId, userEmail, supabase]
  );

  /** Host-only: switch the active problem and update the shared editor content. */
  const handleProblemChange = useCallback(
    (newProblemId: string, starterCode: string) => {
      if (!isHost || !ydocRef.current) return;

      const ymap = ydocRef.current.getMap('metadata');
      ymap.set('active_problem', newProblemId);
      setActiveProblemId(newProblemId);

      const ytext = ydocRef.current.getText('monaco');
      ytext.delete(0, ytext.length);
      ytext.insert(0, starterCode);
    },
    [isHost]
  );

  return {
    activeProblemId,
    setActiveProblemId,
    handleEditorDidMount,
    handleProblemChange,
    editorRef,
  };
}
