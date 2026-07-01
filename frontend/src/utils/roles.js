export const ROLES = {
  MANAGER: 'manager',
  TEAM_MEMBER: 'team_member',
  CLIENT: 'client',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  [ROLES.MANAGER]: 'Manager',
  [ROLES.TEAM_MEMBER]: 'Team Member',
  [ROLES.CLIENT]: 'Client',
  [ROLES.VIEWER]: 'Viewer',
};

export function formatRole(role) {
  return ROLE_LABELS[role] ?? role ?? 'User';
}

export function isManager(user) {
  return user?.role === ROLES.MANAGER;
}

export function isClient(user) {
  return user?.role === ROLES.CLIENT;
}

export function canReview(user) {
  return user?.role === ROLES.MANAGER || user?.role === ROLES.TEAM_MEMBER;
}

export function canApprove(user) {
  return user?.role === ROLES.CLIENT;
}
