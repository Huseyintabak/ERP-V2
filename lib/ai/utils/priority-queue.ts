/**
 * Priority Queue Implementation for Agent Conversations
 * Urgency-based task prioritization (critical > high > medium > low)
 */

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface PriorityQueueItem<T> {
  item: T;
  priority: Urgency;
  createdAt: Date;
  requestId: string;
}

/**
 * Priority values (higher = more urgent)
 */
const PRIORITY_VALUES: Record<Urgency, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

/**
 * Priority Queue Class
 * Thread-safe queue with urgency-based sorting
 */
export class PriorityQueue<T> {
  private queue: PriorityQueueItem<T>[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Add item to queue with priority
   */
  enqueue(item: T, priority: Urgency = 'medium', requestId?: string): void {
    if (this.queue.length >= this.maxSize) {
      // Remove lowest priority item if queue is full
      this.queue.sort((a, b) => PRIORITY_VALUES[b.priority] - PRIORITY_VALUES[a.priority]);
      this.queue.pop();
    }

    const queueItem: PriorityQueueItem<T> = {
      item,
      priority,
      createdAt: new Date(),
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
    };

    this.queue.push(queueItem);
    this.sort();
  }

  /**
   * Remove and return highest priority item
   */
  dequeue(): PriorityQueueItem<T> | null {
    if (this.isEmpty()) {
      return null;
    }

    this.sort();
    return this.queue.shift() || null;
  }

  /**
   * Peek at highest priority item without removing
   */
  peek(): PriorityQueueItem<T> | null {
    if (this.isEmpty()) {
      return null;
    }

    this.sort();
    return this.queue[0];
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get all items sorted by priority
   */
  getAll(): PriorityQueueItem<T>[] {
    this.sort();
    return [...this.queue];
  }

  /**
   * Remove specific item by requestId
   */
  remove(requestId: string): boolean {
    const index = this.queue.findIndex(item => item.requestId === requestId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Sort queue by priority (highest first), then by creation time (oldest first)
   */
  private sort(): void {
    this.queue.sort((a, b) => {
      // First sort by priority (higher priority first)
      const priorityDiff = PRIORITY_VALUES[b.priority] - PRIORITY_VALUES[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // If priorities are equal, sort by creation time (oldest first - FIFO)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byPriority: Record<Urgency, number>;
    oldestItem?: Date;
    newestItem?: Date;
  } {
    const byPriority: Record<Urgency, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    let oldestItem: Date | undefined;
    let newestItem: Date | undefined;

    this.queue.forEach(item => {
      byPriority[item.priority]++;
      
      if (!oldestItem || item.createdAt < oldestItem) {
        oldestItem = item.createdAt;
      }
      
      if (!newestItem || item.createdAt > newestItem) {
        newestItem = item.createdAt;
      }
    });

    return {
      total: this.queue.length,
      byPriority,
      oldestItem,
      newestItem
    };
  }
}

/**
 * Conversation Request Item
 */
export interface ConversationRequestItem {
  agentRole: string;
  request: {
    id: string;
    prompt: string;
    type: 'request' | 'query' | 'analysis' | 'validation';
    context?: Record<string, any>;
    urgency?: Urgency;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Priority Queue Manager for Conversations
 */
export class ConversationPriorityQueue {
  private queue: PriorityQueue<ConversationRequestItem>;

  constructor(maxSize: number = 1000) {
    this.queue = new PriorityQueue<ConversationRequestItem>(maxSize);
  }

  /**
   * Add conversation request to queue
   */
  enqueue(item: ConversationRequestItem): void {
    const priority = item.request.urgency || item.request.severity || 'medium';
    this.queue.enqueue(item, priority, item.request.id);
  }

  /**
   * Get next conversation request (highest priority)
   */
  dequeue(): ConversationRequestItem | null {
    const item = this.queue.dequeue();
    return item ? item.item : null;
  }

  /**
   * Peek at next conversation request
   */
  peek(): ConversationRequestItem | null {
    const item = this.queue.peek();
    return item ? item.item : null;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size();
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Remove conversation by ID
   */
  remove(conversationId: string): boolean {
    return this.queue.remove(conversationId);
  }

  /**
   * Get all pending conversations
   */
  getAll(): ConversationRequestItem[] {
    return this.queue.getAll().map(item => item.item);
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.queue.getStats();
  }
}

// Singleton instance
let conversationQueueInstance: ConversationPriorityQueue | null = null;

/**
 * Get global conversation priority queue instance
 */
export function getConversationPriorityQueue(): ConversationPriorityQueue {
  if (!conversationQueueInstance) {
    conversationQueueInstance = new ConversationPriorityQueue();
  }
  return conversationQueueInstance;
}

