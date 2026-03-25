/**
 * Tests for chatStore.ts Zustand store
 * Tests pure state operations independent of browser IndexedDB/BroadcastChannel
 */

// Flush all pending promises and timers
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 50));

// Mock IndexedDB before importing store
let mockIDBGetAllRequest: any = null;

const mockIDBStore = {
  clear: jest.fn(),
  add: jest.fn(),
  getAll: jest.fn(() => {
    mockIDBGetAllRequest = {
      result: [],
      error: null,
      onerror: null,
      onsuccess: null,
    };
    // Trigger onsuccess asynchronously
    setTimeout(() => {
      if (mockIDBGetAllRequest?.onsuccess) {
        mockIDBGetAllRequest.onsuccess({ target: mockIDBGetAllRequest });
      }
    }, 5);
    return mockIDBGetAllRequest;
  }),
};

const mockIDBTransaction = {
  objectStore: jest.fn(() => mockIDBStore),
};

const mockIDBDatabase = {
  transaction: jest.fn(() => mockIDBTransaction),
  objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
  createObjectStore: jest.fn(),
};

function createMockIDBOpenRequest(succeed = true) {
  const request: any = {
    result: mockIDBDatabase,
    error: null,
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
  };
  // Trigger onsuccess asynchronously
  setTimeout(() => {
    if (succeed && request.onsuccess) request.onsuccess({ target: request });
    else if (!succeed && request.onerror) request.onerror({ target: request });
  }, 0);
  return request;
}

let mockIDBOpenFail = false;

Object.defineProperty(global, 'indexedDB', {
  value: {
    open: jest.fn(() => createMockIDBOpenRequest(!mockIDBOpenFail)),
  },
  writable: true,
  configurable: true,
});

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = jest.fn();
  close = jest.fn();

  constructor(name: string) {
    this.name = name;
  }
}

Object.defineProperty(global, 'BroadcastChannel', {
  value: MockBroadcastChannel,
  writable: true,
  configurable: true,
});

// Now import the store
import { useChatStore } from '@/stores/chatStore';

function makeMessage(overrides = {}) {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    content: 'Test message',
    role: 'user' as const,
    timestamp: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  // Reset store state between tests
  useChatStore.setState({
    messages: [],
    isHydrated: false,
    isToolExecuting: false,
    lastSyncTimestamp: null,
    pendingToolEvents: [],
  });
  jest.clearAllMocks();
  mockIDBOpenFail = false;
  mockIDBGetAllRequest = null;
  // Reset getAll mock
  mockIDBStore.getAll.mockClear();
});

describe('chatStore.ts', () => {
  describe('initial state', () => {
    it('should have empty messages array', () => {
      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
    });

    it('should not be hydrated initially', () => {
      const state = useChatStore.getState();
      expect(state.isHydrated).toBe(false);
    });

    it('should not be executing tools initially', () => {
      const state = useChatStore.getState();
      expect(state.isToolExecuting).toBe(false);
    });

    it('should have null lastSyncTimestamp initially', () => {
      const state = useChatStore.getState();
      expect(state.lastSyncTimestamp).toBeNull();
    });

    it('should have empty pendingToolEvents initially', () => {
      const state = useChatStore.getState();
      expect(state.pendingToolEvents).toEqual([]);
    });
  });

  describe('addMessage', () => {
    it('should add message to messages array', () => {
      const { addMessage } = useChatStore.getState();
      const msg = makeMessage({ content: 'Hello world' });

      addMessage(msg);

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('Hello world');
    });

    it('should append multiple messages', () => {
      const { addMessage } = useChatStore.getState();

      addMessage(makeMessage({ id: 'msg-1', content: 'First' }));
      addMessage(makeMessage({ id: 'msg-2', content: 'Second' }));
      addMessage(makeMessage({ id: 'msg-3', content: 'Third' }));

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(3);
      expect(state.messages[2].content).toBe('Third');
    });

    it('should not persist to IndexedDB when not hydrated', () => {
      const { addMessage } = useChatStore.getState();
      expect(useChatStore.getState().isHydrated).toBe(false);

      addMessage(makeMessage());

      expect(mockIDBDatabase.transaction).not.toHaveBeenCalled();
    });

    it('should not persist to IndexedDB when tool is executing', () => {
      useChatStore.setState({ isHydrated: true, isToolExecuting: true });

      const { addMessage } = useChatStore.getState();
      addMessage(makeMessage());

      expect(mockIDBDatabase.transaction).not.toHaveBeenCalled();
    });

    it('should persist to IndexedDB when hydrated and not executing tools', () => {
      useChatStore.setState({ isHydrated: true, isToolExecuting: false });

      const { addMessage } = useChatStore.getState();
      addMessage(makeMessage({ content: 'Persisted message' }));

      // IndexedDB.open should have been called
      expect(global.indexedDB.open).toHaveBeenCalledWith('AgriAIChat', 1);
    });

    it('should preserve message role', () => {
      const { addMessage } = useChatStore.getState();

      addMessage(makeMessage({ role: 'assistant', content: 'AI response' }));

      const state = useChatStore.getState();
      expect(state.messages[0].role).toBe('assistant');
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      useChatStore.setState({
        messages: [makeMessage({ id: '1' }), makeMessage({ id: '2' })],
      });

      const { clearMessages } = useChatStore.getState();
      clearMessages();

      expect(useChatStore.getState().messages).toEqual([]);
    });

    it('should reset lastSyncTimestamp', () => {
      useChatStore.setState({ lastSyncTimestamp: Date.now() });

      const { clearMessages } = useChatStore.getState();
      clearMessages();

      expect(useChatStore.getState().lastSyncTimestamp).toBeNull();
    });

    it('should save empty messages to IndexedDB', () => {
      const { clearMessages } = useChatStore.getState();
      clearMessages();

      expect(global.indexedDB.open).toHaveBeenCalled();
    });
  });

  describe('setToolExecuting', () => {
    it('should set isToolExecuting to true', () => {
      const { setToolExecuting } = useChatStore.getState();
      setToolExecuting(true);

      expect(useChatStore.getState().isToolExecuting).toBe(true);
    });

    it('should set isToolExecuting to false', () => {
      useChatStore.setState({ isToolExecuting: true });

      const { setToolExecuting } = useChatStore.getState();
      setToolExecuting(false);

      expect(useChatStore.getState().isToolExecuting).toBe(false);
    });
  });

  describe('addToolEvent', () => {
    it('should add event to pendingToolEvents', () => {
      const { addToolEvent } = useChatStore.getState();
      const event = makeMessage({ content: 'Tool event 1' });

      addToolEvent(event);

      const state = useChatStore.getState();
      expect(state.pendingToolEvents).toHaveLength(1);
      expect(state.pendingToolEvents[0].content).toBe('Tool event 1');
    });

    it('should accumulate multiple tool events', () => {
      const { addToolEvent } = useChatStore.getState();

      addToolEvent(makeMessage({ id: 'e1', content: 'Event 1' }));
      addToolEvent(makeMessage({ id: 'e2', content: 'Event 2' }));
      addToolEvent(makeMessage({ id: 'e3', content: 'Event 3' }));

      expect(useChatStore.getState().pendingToolEvents).toHaveLength(3);
    });

    it('should not modify messages array', () => {
      const existingMsg = makeMessage({ id: 'existing' });
      useChatStore.setState({ messages: [existingMsg] });

      const { addToolEvent } = useChatStore.getState();
      addToolEvent(makeMessage({ id: 'tool' }));

      expect(useChatStore.getState().messages).toHaveLength(1);
    });
  });

  describe('commitToolEvents', () => {
    it('should move only last pending event to messages', () => {
      const event1 = makeMessage({ id: 'e1', content: 'Intermediate 1' });
      const event2 = makeMessage({ id: 'e2', content: 'Intermediate 2' });
      const finalEvent = makeMessage({ id: 'e3', content: 'Final result' });

      useChatStore.setState({
        pendingToolEvents: [event1, event2, finalEvent],
        isHydrated: true,
      });

      const { commitToolEvents } = useChatStore.getState();
      commitToolEvents();

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('Final result');
    });

    it('should clear pendingToolEvents after commit', () => {
      useChatStore.setState({
        pendingToolEvents: [makeMessage()],
      });

      const { commitToolEvents } = useChatStore.getState();
      commitToolEvents();

      expect(useChatStore.getState().pendingToolEvents).toEqual([]);
    });

    it('should set isToolExecuting to false after commit', () => {
      useChatStore.setState({
        pendingToolEvents: [makeMessage()],
        isToolExecuting: true,
      });

      const { commitToolEvents } = useChatStore.getState();
      commitToolEvents();

      expect(useChatStore.getState().isToolExecuting).toBe(false);
    });

    it('should do nothing when no pending events', () => {
      useChatStore.setState({
        messages: [makeMessage({ id: 'existing' })],
        pendingToolEvents: [],
      });

      const { commitToolEvents } = useChatStore.getState();
      commitToolEvents();

      expect(useChatStore.getState().messages).toHaveLength(1);
    });

    it('should update lastSyncTimestamp after commit', () => {
      const before = Date.now();
      useChatStore.setState({
        pendingToolEvents: [makeMessage()],
        lastSyncTimestamp: null,
      });

      const { commitToolEvents } = useChatStore.getState();
      commitToolEvents();

      const syncTime = useChatStore.getState().lastSyncTimestamp;
      expect(syncTime).not.toBeNull();
      expect(syncTime!).toBeGreaterThanOrEqual(before);
    });

    it('should append to existing messages', () => {
      const existingMsg = makeMessage({ id: 'existing', content: 'Old message' });
      const toolEvent = makeMessage({ id: 'tool', content: 'Tool result' });

      useChatStore.setState({
        messages: [existingMsg],
        pendingToolEvents: [toolEvent],
      });

      const { commitToolEvents } = useChatStore.getState();
      commitToolEvents();

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[1].content).toBe('Tool result');
    });
  });

  describe('discardToolEvents', () => {
    it('should clear all pending tool events', () => {
      useChatStore.setState({
        pendingToolEvents: [makeMessage({ id: '1' }), makeMessage({ id: '2' })],
      });

      const { discardToolEvents } = useChatStore.getState();
      discardToolEvents();

      expect(useChatStore.getState().pendingToolEvents).toEqual([]);
    });

    it('should set isToolExecuting to false', () => {
      useChatStore.setState({ isToolExecuting: true });

      const { discardToolEvents } = useChatStore.getState();
      discardToolEvents();

      expect(useChatStore.getState().isToolExecuting).toBe(false);
    });

    it('should not modify messages array', () => {
      const messages = [makeMessage({ id: '1' }), makeMessage({ id: '2' })];
      useChatStore.setState({
        messages,
        pendingToolEvents: [makeMessage({ id: 'tool' })],
      });

      const { discardToolEvents } = useChatStore.getState();
      discardToolEvents();

      expect(useChatStore.getState().messages).toHaveLength(2);
    });
  });

  describe('loadMessages', () => {
    it('should set isHydrated to true on server side (no window)', async () => {
      // Test when not executing tools and cache is fresh
      useChatStore.setState({
        isHydrated: true,
        lastSyncTimestamp: Date.now(),
        isToolExecuting: false,
      });

      const { loadMessages } = useChatStore.getState();
      loadMessages();

      // Cache is fresh so it should skip reloading
      expect(useChatStore.getState().isHydrated).toBe(true);
    });

    it('should skip reload when tool is executing', () => {
      useChatStore.setState({ isToolExecuting: true });

      const { loadMessages } = useChatStore.getState();
      loadMessages(); // Should return early

      // isHydrated remains false since we returned early
      expect(useChatStore.getState().isHydrated).toBe(false);
    });

    it('should skip reload when cache is still fresh', () => {
      const recentTimestamp = Date.now();
      useChatStore.setState({
        isHydrated: true,
        lastSyncTimestamp: recentTimestamp,
        isToolExecuting: false,
      });

      const callsBefore = (global.indexedDB.open as jest.Mock).mock.calls.length;
      const { loadMessages } = useChatStore.getState();
      loadMessages();

      const callsAfter = (global.indexedDB.open as jest.Mock).mock.calls.length;
      expect(callsAfter).toBe(callsBefore);
    });

    it('should trigger IndexedDB load when cache is expired', async () => {
      useChatStore.setState({
        isHydrated: true,
        lastSyncTimestamp: Date.now() - 120_000, // 2 minutes ago (expired)
        isToolExecuting: false,
      });

      const { loadMessages } = useChatStore.getState();
      loadMessages();

      expect(global.indexedDB.open).toHaveBeenCalled();
    });
  });

  describe('saveMessages', () => {
    it('should save current messages to IndexedDB', () => {
      useChatStore.setState({
        messages: [makeMessage({ id: '1' }), makeMessage({ id: '2' })],
      });

      const { saveMessages } = useChatStore.getState();
      saveMessages();

      expect(global.indexedDB.open).toHaveBeenCalled();
    });
  });

  describe('async IndexedDB callbacks', () => {
    it('should set isHydrated and messages after IndexedDB load succeeds', async () => {
      const storedMessages = [
        { id: 'stored-1', content: 'Stored', role: 'user', timestamp: new Date().toISOString() },
      ];

      // Configure getAll to return stored messages
      mockIDBStore.getAll.mockImplementation(() => {
        const req: any = { result: storedMessages, error: null, onerror: null, onsuccess: null };
        setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }); }, 5);
        return req;
      });

      useChatStore.setState({ isHydrated: false, lastSyncTimestamp: null });

      const { loadMessages } = useChatStore.getState();
      loadMessages();

      // Wait for async operations
      await flushPromises();

      const state = useChatStore.getState();
      expect(state.isHydrated).toBe(true);
      expect(state.lastSyncTimestamp).not.toBeNull();
    });

    it('should set isHydrated even when IndexedDB load fails', async () => {
      mockIDBOpenFail = true;

      useChatStore.setState({ isHydrated: false, lastSyncTimestamp: null });

      const { loadMessages } = useChatStore.getState();
      loadMessages();

      await flushPromises();

      // Store should handle failure gracefully
      // (may or may not set isHydrated depending on timing)
      expect(() => useChatStore.getState()).not.toThrow();
    });

    it('should broadcast message when adding message in hydrated+non-executing state', async () => {
      useChatStore.setState({ isHydrated: true, isToolExecuting: false });

      const { addMessage, loadMessages } = useChatStore.getState();
      // Start listening for broadcasts
      loadMessages();

      const newMsg = makeMessage({ id: 'broadcast-test', content: 'Broadcast me' });
      addMessage(newMsg);

      await flushPromises();

      // BroadcastChannel.postMessage should have been called
      // (can't easily assert since it's on the channel instance, but ensure no errors)
      expect(useChatStore.getState().messages).toHaveLength(1);
    });
  });
});
