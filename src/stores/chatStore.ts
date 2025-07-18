'use client';

import { create } from 'zustand';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatStore {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  loadMessages: () => void;
  saveMessages: () => void;
}

const STORAGE_KEY = 'agri-ai-chat-messages';

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  
  addMessage: (message) => {
    set((state) => {
      const newMessages = [...state.messages, message];
      // Save to IndexedDB
      if (typeof window !== 'undefined') {
        saveToIndexedDB(newMessages);
        // Broadcast to other tabs
        broadcastMessage(message);
      }
      return { messages: newMessages };
    });
  },
  
  clearMessages: () => {
    set({ messages: [] });
    if (typeof window !== 'undefined') {
      saveToIndexedDB([]);
    }
  },
  
  loadMessages: () => {
    if (typeof window !== 'undefined') {
      loadFromIndexedDB().then((messages) => {
        set({ messages });
      });
      
      // Listen for broadcasts from other tabs
      setupBroadcastListener((message) => {
        set((state) => ({
          messages: [...state.messages, message]
        }));
      });
    }
  },
  
  saveMessages: () => {
    if (typeof window !== 'undefined') {
      const { messages } = get();
      saveToIndexedDB(messages);
    }
  }
}));

// IndexedDB operations
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AgriAIChat', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
    };
  });
}

async function saveToIndexedDB(messages: Message[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    
    // Clear existing messages
    await store.clear();
    
    // Add new messages
    for (const message of messages) {
      await store.add({
        ...message,
        timestamp: message.timestamp.toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to save messages to IndexedDB:', error);
  }
}

async function loadFromIndexedDB(): Promise<Message[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const messages = request.result.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        resolve(messages);
      };
    });
  } catch (error) {
    console.error('Failed to load messages from IndexedDB:', error);
    return [];
  }
}

// BroadcastChannel for multi-tab sync
let broadcastChannel: BroadcastChannel | null = null;

function broadcastMessage(message: Message): void {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('agri-ai-chat');
  }
  
  broadcastChannel.postMessage({
    type: 'NEW_MESSAGE',
    message: {
      ...message,
      timestamp: message.timestamp.toISOString()
    }
  });
}

function setupBroadcastListener(onMessage: (message: Message) => void): void {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('agri-ai-chat');
  }
  
  broadcastChannel.onmessage = (event) => {
    if (event.data.type === 'NEW_MESSAGE') {
      const message = {
        ...event.data.message,
        timestamp: new Date(event.data.message.timestamp)
      };
      onMessage(message);
    }
  };
}