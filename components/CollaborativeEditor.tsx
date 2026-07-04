// components/CollaborativeEditor.tsx
'use client';

import Editor from '@monaco-editor/react';
import { useRef, useEffect } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import * as awarenessProtocol from 'y-protocols/awareness';
import type { editor } from 'monaco-editor';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Helper to generate a random hex color for the user's cursor
const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

interface CollaborativeEditorProps {
  roomId: string;
}

export default function CollaborativeEditor({ roomId }: CollaborativeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const supabase = createClient();

  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      bindingRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  function handleEditorDidMount(editorInstance: editor.IStandaloneCodeEditor) {
    editorRef.current = editorInstance;
    
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const type = ydoc.getText('monaco');

    // --- 1. AWARENESS (CURSORS) SETUP ---
    const awareness = new awarenessProtocol.Awareness(ydoc);
    
    // Set the local user's cursor metadata
    awareness.setLocalStateField('user', {
      name: `User ${Math.floor(Math.random() * 1000)}`, // We can wire this to Auth later
      color: getRandomColor()
    });

    bindingRef.current = new MonacoBinding(
      type,
      editorInstance.getModel()!,
      new Set([editorInstance]),
      awareness 
    );

    const channel = supabase.channel(`room-${roomId}`);
    channelRef.current = channel;

    // --- 2. DOCUMENT SYNC & BOOTSTRAPPING ---

    // A. Broadcast local keystrokes
    ydoc.on('update', (update, origin) => {
      if (origin !== 'supabase') {
        channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: Array.from(update) },
        });
      }
    });

    // B. Listen for incoming updates (both keystrokes and full state handshakes)
    channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      const remoteUpdate = new Uint8Array(payload.update);
      Y.applyUpdate(ydoc, remoteUpdate, 'supabase');
    });

    // C. The Handshake: When someone asks for state, send our full local state
    channel.on('broadcast', { event: 'request-state' }, () => {
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: Array.from(stateUpdate) },
      });
    });


    // --- 3. CURSOR SYNC ---

    // A. Broadcast local cursor movements
    awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: string) => {
      if (origin !== 'supabase') {
        const changedClients = added.concat(updated, removed);
        const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
        channel.send({
          type: 'broadcast',
          event: 'awareness-update',
          payload: { update: Array.from(update) }
        });
      }
    });

    // B. Apply remote cursor movements
    channel.on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
      const update = new Uint8Array(payload.update);
      awarenessProtocol.applyAwarenessUpdate(awareness, update, 'supabase');
    });

    // --- 4. CONNECTION INITIALIZATION ---
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // We just joined. Ask anyone currently in the room for the full document state.
        channel.send({
          type: 'broadcast',
          event: 'request-state',
        });
      }
    });
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="cpp"
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          padding: { top: 16 },
          fontSize: 14,
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}