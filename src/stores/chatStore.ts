"use client";

import { create } from "zustand";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatStore {
  messages: Message[];
  isHydrated: boolean;
  isToolExecuting: boolean;
  lastSyncTimestamp: number | null;
  pendingToolEvents: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  loadMessages: () => void;
  saveMessages: () => void;
  setToolExecuting: (executing: boolean) => void;
  addToolEvent: (event: Message) => void;
  commitToolEvents: () => void;
  discardToolEvents: () => void;
}

const STORAGE_KEY = "agri-ai-chat-messages";
const CACHE_TTL_MS = 60_000; // 1 minute cache TTL

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isHydrated: false,
  isToolExecuting: false,
  lastSyncTimestamp: null,
  pendingToolEvents: [],

  addMessage: (message) => {
    set((state) => {
      const newMessages = [...state.messages, message];
      // Save to IndexedDB only after hydration and when not executing tools
      if (
        typeof window !== "undefined" &&
        state.isHydrated &&
        !state.isToolExecuting
      ) {
        saveToIndexedDB(newMessages);
        // Broadcast to other tabs
        broadcastMessage(message);
      }
      return { messages: newMessages };
    });
  },

  clearMessages: () => {
    set({ messages: [], lastSyncTimestamp: null });
    if (typeof window !== "undefined") {
      saveToIndexedDB([]);
    }
  },

  loadMessages: () => {
    if (typeof window !== "undefined") {
      const state = get();

      // Do not reload during tool execution (improvement #1)
      if (state.isToolExecuting) {
        return;
      }

      // Skip reload if cache is still fresh (improvement #2)
      if (
        state.isHydrated &&
        state.lastSyncTimestamp !== null &&
        Date.now() - state.lastSyncTimestamp < CACHE_TTL_MS
      ) {
        return;
      }

      loadFromIndexedDB()
        .then((messages) => {
          set({ messages, isHydrated: true, lastSyncTimestamp: Date.now() });
        })
        .catch(() => {
          set({ isHydrated: true, lastSyncTimestamp: Date.now() });
        });

      // Listen for broadcasts from other tabs
      setupBroadcastListener((message) => {
        set((state) => {
          if (state.isHydrated && !state.isToolExecuting) {
            return { messages: [...state.messages, message] };
          }
          return state;
        });
      });
    } else {
      set({ isHydrated: true, lastSyncTimestamp: Date.now() });
    }
  },

  saveMessages: () => {
    if (typeof window !== "undefined") {
      const { messages } = get();
      saveToIndexedDB(messages);
    }
  },

  // Improvement #1 & #3: control tool execution state
  setToolExecuting: (executing) => {
    set({ isToolExecuting: executing });
  },

  // Improvement #3: buffer intermediate tool events without persisting
  addToolEvent: (event) => {
    set((state) => ({
      pendingToolEvents: [...state.pendingToolEvents, event],
    }));
  },

  // Improvement #3: commit only final tool event to history
  commitToolEvents: () => {
    set((state) => {
      const pending = state.pendingToolEvents;
      if (pending.length === 0) return state;

      // Only include the last (final) event from the tool execution
      const finalEvent = pending[pending.length - 1];
      const newMessages = [...state.messages, finalEvent];

      if (typeof window !== "undefined" && state.isHydrated) {
        saveToIndexedDB(newMessages);
        broadcastMessage(finalEvent);
      }

      return {
        messages: newMessages,
        pendingToolEvents: [],
        isToolExecuting: false,
        lastSyncTimestamp: Date.now(),
      };
    });
  },

  discardToolEvents: () => {
    set({ pendingToolEvents: [], isToolExecuting: false });
  },
}));

// IndexedDB operations
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AgriAIChat", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }
    };
  });
}

async function saveToIndexedDB(messages: Message[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(["messages"], "readwrite");
    const store = transaction.objectStore("messages");

    store.clear();

    for (const message of messages) {
      store.add({
        ...message,
        timestamp: message.timestamp.toISOString(),
      });
    }
  } catch (error) {
    console.error("Failed to save messages to IndexedDB:", error);
  }
}

async function loadFromIndexedDB(): Promise<Message[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(["messages"], "readonly");
    const store = transaction.objectStore("messages");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const messages = request.result.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        resolve(messages);
      };
    });
  } catch (error) {
    console.error("Failed to load messages from IndexedDB:", error);
    return [];
  }
}

// BroadcastChannel for multi-tab sync
let broadcastChannel: BroadcastChannel | null = null;

function broadcastMessage(message: Message): void {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel("agri-ai-chat");
  }

  broadcastChannel.postMessage({
    type: "NEW_MESSAGE",
    message: {
      ...message,
      timestamp: message.timestamp.toISOString(),
    },
  });
}

function setupBroadcastListener(onMessage: (message: Message) => void): void {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel("agri-ai-chat");
  }

  broadcastChannel.onmessage = (event) => {
    if (event.data.type === "NEW_MESSAGE") {
      const message = {
        ...event.data.message,
        timestamp: new Date(event.data.message.timestamp),
      };
      onMessage(message);
    }
  };
}
