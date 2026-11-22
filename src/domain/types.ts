export const roles = ['Requester', 'Reviewer'] as const;
export type Role = (typeof roles)[number];
export const statuses = ['Draft', 'PendingReview', 'ChangesRequested', 'Approved'] as const;
export type ChangeStatus = (typeof statuses)[number];
export type ReviewAction = 'APPROVED' | 'CHANGES_REQUESTED';

export interface Actor { userId: string; roles: Role[] }
export interface ChangeRequest {
  id: string; title: string; description: string; reason: string; requesterId: string;
  status: ChangeStatus; version: number; createdAt: string; updatedAt: string;
}
export interface ReviewDecision {
  id: string; changeRequestId: string; reviewerId: string; action: ReviewAction;
  comment: string | null; createdAt: string;
}
export interface ChangeRequestDetail extends ChangeRequest { reviewDecisions?: ReviewDecision[] }
export interface CreateCommand { title: string; description: string; reason: string }
export interface EditCommand extends CreateCommand { expectedVersion: number }
export interface VersionedCommand { expectedVersion: number }
export interface RequestChangesCommand extends VersionedCommand { comment: string }

export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409,
    public readonly code: string,
    message: string
  ) { super(message); }
}
