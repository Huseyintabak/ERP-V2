/**
 * Priority Queue Tests
 * Tests for urgency-based sorting and critical operations prioritization
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationPriorityQueue, ConversationRequestItem } from '../priority-queue';

describe('ConversationPriorityQueue', () => {
  let queue: ConversationPriorityQueue;

  beforeEach(() => {
    queue = new ConversationPriorityQueue(100);
  });

  describe('Urgency-based Sorting', () => {
    it('should enqueue and dequeue items', () => {
      const item1: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'medium'
        }
      };

      queue.enqueue(item1);
      expect(queue.isEmpty()).toBe(false);

      const dequeued = queue.dequeue();
      expect(dequeued).toEqual(item1);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should prioritize critical over high', () => {
      const item1: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'high'
        }
      };

      const item2: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req2',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'critical'
        }
      };

      queue.enqueue(item1);
      queue.enqueue(item2);

      const first = queue.dequeue();
      expect(first?.request.urgency).toBe('critical');
      expect(first?.request.id).toBe('req2');
    });

    it('should prioritize high over medium', () => {
      const item1: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'medium'
        }
      };

      const item2: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req2',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'high'
        }
      };

      queue.enqueue(item1);
      queue.enqueue(item2);

      const first = queue.dequeue();
      expect(first?.request.urgency).toBe('high');
      expect(first?.request.id).toBe('req2');
    });

    it('should prioritize medium over low', () => {
      const item1: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'low'
        }
      };

      const item2: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req2',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'medium'
        }
      };

      queue.enqueue(item1);
      queue.enqueue(item2);

      const first = queue.dequeue();
      expect(first?.request.urgency).toBe('medium');
      expect(first?.request.id).toBe('req2');
    });

    it('should maintain FIFO order for same priority', () => {
      const item1: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'medium'
        }
      };

      const item2: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req2',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'medium'
        }
      };

      const item3: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req3',
          prompt: 'Test prompt',
          type: 'validation',
          urgency: 'medium'
        }
      };

      queue.enqueue(item1);
      queue.enqueue(item2);
      queue.enqueue(item3);

      expect(queue.dequeue()?.request.id).toBe('req1');
      expect(queue.dequeue()?.request.id).toBe('req2');
      expect(queue.dequeue()?.request.id).toBe('req3');
    });
  });

  describe('Critical Operations Prioritization', () => {
    it('should process critical items first in mixed queue', () => {
      const items: ConversationRequestItem[] = [
        {
          agentRole: 'Planning Agent',
          request: { id: 'req1', prompt: 'Test', type: 'validation', urgency: 'low' }
        },
        {
          agentRole: 'Planning Agent',
          request: { id: 'req2', prompt: 'Test', type: 'validation', urgency: 'critical' }
        },
        {
          agentRole: 'Planning Agent',
          request: { id: 'req3', prompt: 'Test', type: 'validation', urgency: 'medium' }
        },
        {
          agentRole: 'Planning Agent',
          request: { id: 'req4', prompt: 'Test', type: 'validation', urgency: 'high' }
        },
        {
          agentRole: 'Planning Agent',
          request: { id: 'req5', prompt: 'Test', type: 'validation', urgency: 'critical' }
        }
      ];

      items.forEach(item => queue.enqueue(item));

      // First should be critical (req2 - first critical)
      expect(queue.dequeue()?.request.id).toBe('req2');
      
      // Second should be critical (req5 - second critical)
      expect(queue.dequeue()?.request.id).toBe('req5');
      
      // Third should be high
      expect(queue.dequeue()?.request.urgency).toBe('high');
      
      // Fourth should be medium
      expect(queue.dequeue()?.request.urgency).toBe('medium');
      
      // Last should be low
      expect(queue.dequeue()?.request.urgency).toBe('low');
    });

    it('should handle all urgency levels correctly', () => {
      const urgencyOrder = ['critical', 'high', 'medium', 'low'];
      
      // Add items in reverse order
      for (let i = urgencyOrder.length - 1; i >= 0; i--) {
        queue.enqueue({
          agentRole: 'Planning Agent',
          request: {
            id: `req-${urgencyOrder[i]}`,
            prompt: 'Test',
            type: 'validation',
            urgency: urgencyOrder[i] as any
          }
        });
      }

      // Should dequeue in correct priority order
      for (let i = 0; i < urgencyOrder.length; i++) {
        const dequeued = queue.dequeue();
        expect(dequeued?.request.urgency).toBe(urgencyOrder[i]);
      }
    });
  });

  describe('Queue Management', () => {
    it('should return correct size', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue({
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test',
          type: 'validation',
          urgency: 'medium'
        }
      });

      expect(queue.size()).toBe(1);

      queue.enqueue({
        agentRole: 'Planning Agent',
        request: {
          id: 'req2',
          prompt: 'Test',
          type: 'validation',
          urgency: 'high'
        }
      });

      expect(queue.size()).toBe(2);
    });

    it('should check if empty', () => {
      expect(queue.isEmpty()).toBe(true);

      queue.enqueue({
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test',
          type: 'validation',
          urgency: 'medium'
        }
      });

      expect(queue.isEmpty()).toBe(false);

      queue.dequeue();
      expect(queue.isEmpty()).toBe(true);
    });

    it('should peek without removing', () => {
      const item: ConversationRequestItem = {
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test',
          type: 'validation',
          urgency: 'critical'
        }
      };

      queue.enqueue(item);

      const peeked = queue.peek();
      expect(peeked).toEqual(item);
      expect(queue.size()).toBe(1); // Should not remove

      const dequeued = queue.dequeue();
      expect(dequeued).toEqual(item);
      expect(queue.size()).toBe(0);
    });

    it('should handle max size limit', () => {
      const smallQueue = new ConversationPriorityQueue(2);

      smallQueue.enqueue({
        agentRole: 'Planning Agent',
        request: {
          id: 'req1',
          prompt: 'Test',
          type: 'validation',
          urgency: 'low'
        }
      });

      smallQueue.enqueue({
        agentRole: 'Planning Agent',
        request: {
          id: 'req2',
          prompt: 'Test',
          type: 'validation',
          urgency: 'low'
        }
      });

      // Adding third should remove lowest priority (req1)
      smallQueue.enqueue({
        agentRole: 'Planning Agent',
        request: {
          id: 'req3',
          prompt: 'Test',
          type: 'validation',
          urgency: 'medium'
        }
      });

      expect(smallQueue.size()).toBe(2);
      
      // Should have req3 (medium) and one of req1/req2 (low), the other removed
      // When queue is full, lowest priority items are removed first (FIFO among same priority)
      const first = smallQueue.dequeue();
      expect(first?.request.urgency).toBe('medium');
      expect(first?.request.id).toBe('req3');
      
      const second = smallQueue.dequeue();
      expect(second?.request.urgency).toBe('low');
      // Either req1 or req2 could remain (both are low priority)
      // The exact order depends on timing, but we should have exactly one low priority item
      expect(['req1', 'req2']).toContain(second?.request.id);
    });
  });
});
