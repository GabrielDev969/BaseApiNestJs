export const QUEUE = {
  emails: 'emails',
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];
