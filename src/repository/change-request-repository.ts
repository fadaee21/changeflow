import type { Actor, ChangeRequest, ChangeStatus, CreateCommand, ReviewAction, ReviewDecision } from '../domain/types.js';

export interface ConditionalUpdate {
  id: string; expectedVersion: number; expectedStatus?: ChangeStatus;
  fields: Partial<Pick<ChangeRequest, 'title' | 'description' | 'reason' | 'status'>>;
}
export interface ChangeRequestRepository {
  create(actor: Actor, command: CreateCommand): ChangeRequest;
  findById(id: string): ChangeRequest | undefined;
  listAccessible(actor: Actor): ChangeRequest[];
  listDecisions(id: string): ReviewDecision[];
  update(input: ConditionalUpdate): ChangeRequest | undefined;
  delete(id: string, expectedVersion: number, expectedStatus: ChangeStatus): boolean;
  addDecisionAndTransition(input: { id: string; expectedVersion: number; reviewerId: string; action: ReviewAction; comment: string | null; nextStatus: ChangeStatus }): ChangeRequest | undefined;
}
