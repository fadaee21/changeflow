import { AppError, type Actor, type ChangeRequest, type ChangeRequestDetail, type CreateCommand, type EditCommand } from '../domain/types.js';
import type { ChangeRequestRepository } from '../repository/change-request-repository.js';

const hasRole = (actor: Actor, role: 'Requester' | 'Reviewer') => actor.roles.includes(role);
const required = (value: string, field: string): string => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new AppError(400, 'VALIDATION_ERROR', `${field} is required`);
  return trimmed;
};

export class ChangeRequestService {
  constructor(private readonly repository: ChangeRequestRepository) {}

  create(actor: Actor, command: CreateCommand): ChangeRequest {
    this.requireRole(actor, 'Requester');
    return this.repository.create(actor, {
      title: required(command.title, 'title'),
      description: required(command.description, 'description'),
      reason: required(command.reason, 'reason')
    });
  }

  list(actor: Actor): ChangeRequest[] {
    if (!actor.roles.length) throw new AppError(403, 'FORBIDDEN', 'A project role is required');
    return this.repository.listAccessible(actor);
  }

  get(actor: Actor, id: string): ChangeRequestDetail {
    const request = this.requireViewable(actor, id);
    return request.requesterId === actor.userId && hasRole(actor, 'Requester')
      ? { ...request, reviewDecisions: this.repository.listDecisions(id) }
      : request;
  }

  edit(actor: Actor, id: string, command: CreateCommand, expectedVersion: number): ChangeRequest {
    const request = this.requireOwnerForOperation(actor, id);
    this.requireRole(actor, 'Requester');
    if (request.status !== 'Draft' && request.status !== 'ChangesRequested') this.invalidState();
    const updated = this.repository.update({
      id, expectedVersion, expectedStatus: request.status,
      fields: { title: required(command.title, 'title'), description: required(command.description, 'description'), reason: required(command.reason, 'reason') }
    });
    return updated ?? this.stale();
  }

  submit(actor: Actor, id: string, expectedVersion: number): ChangeRequest {
    const request = this.requireOwnerForOperation(actor, id);
    this.requireRole(actor, 'Requester');
    if (request.status !== 'Draft' && request.status !== 'ChangesRequested') this.invalidState();
    required(request.title, 'title'); required(request.description, 'description'); required(request.reason, 'reason');
    const updated = this.repository.update({ id, expectedVersion, expectedStatus: request.status, fields: { status: 'PendingReview' } });
    return updated ?? this.stale();
  }

  delete(actor: Actor, id: string, expectedVersion: number): void {
    const request = this.requireOwnerForOperation(actor, id);
    this.requireRole(actor, 'Requester');
    if (request.status !== 'Draft') this.invalidState();
    if (!this.repository.delete(id, expectedVersion, 'Draft')) this.stale();
  }

  approve(actor: Actor, id: string, expectedVersion: number): ChangeRequest {
    const request = this.requireViewable(actor, id);
    this.requireRole(actor, 'Reviewer');
    if (request.requesterId === actor.userId) throw new AppError(403, 'SELF_REVIEW_FORBIDDEN', 'Requesters cannot approve their own request');
    if (request.status !== 'PendingReview') this.invalidState();
    const updated = this.repository.addDecisionAndTransition({ id, expectedVersion, reviewerId: actor.userId, action: 'APPROVED', comment: null, nextStatus: 'Approved' });
    return updated ?? this.stale();
  }

  requestChanges(actor: Actor, id: string, expectedVersion: number, comment: string): ChangeRequest {
    const request = this.requireViewable(actor, id);
    this.requireRole(actor, 'Reviewer');
    if (request.requesterId === actor.userId) throw new AppError(403, 'SELF_REVIEW_FORBIDDEN', 'Requesters cannot review their own request');
    if (request.status !== 'PendingReview') this.invalidState();
    const updated = this.repository.addDecisionAndTransition({ id, expectedVersion, reviewerId: actor.userId, action: 'CHANGES_REQUESTED', comment: required(comment, 'comment'), nextStatus: 'ChangesRequested' });
    return updated ?? this.stale();
  }

  private requireViewable(actor: Actor, id: string): ChangeRequest {
    const request = this.repository.findById(id);
    if (!request) throw new AppError(404, 'UNAVAILABLE', 'Change Request is unavailable');
    if ((request.requesterId === actor.userId && hasRole(actor, 'Requester'))
      || (hasRole(actor, 'Reviewer') && request.status === 'PendingReview')) return request;
    throw new AppError(404, 'UNAVAILABLE', 'Change Request is unavailable');
  }

  private requireOwnerForOperation(actor: Actor, id: string): ChangeRequest {
    const request = this.repository.findById(id);
    if (!request) throw new AppError(404, 'UNAVAILABLE', 'Change Request is unavailable');
    if (request.requesterId === actor.userId) return request;
    if (hasRole(actor, 'Reviewer') && request.status === 'PendingReview') throw new AppError(403, 'FORBIDDEN', 'This operation is not permitted');
    throw new AppError(404, 'UNAVAILABLE', 'Change Request is unavailable');
  }

  private requireRole(actor: Actor, role: 'Requester' | 'Reviewer'): void {
    if (!hasRole(actor, role)) throw new AppError(403, 'FORBIDDEN', `${role} role is required`);
  }
  private invalidState(): never { throw new AppError(409, 'INVALID_STATE', 'The operation is not allowed in the current state'); }
  private stale(): never { throw new AppError(409, 'STALE_VERSION', 'The request has changed; refresh and retry'); }
}
