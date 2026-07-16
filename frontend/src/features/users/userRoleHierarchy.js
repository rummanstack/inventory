const ROLE_RANK = {
  operator: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
  system_developer: 5,
};

const ASSIGNABLE_ROLES = {
  operator: [],
  manager: ['operator'],
  admin: ['manager', 'operator'],
  super_admin: ['admin', 'manager', 'operator'],
  system_developer: ['super_admin', 'admin', 'manager', 'operator'],
};

export function getAssignableRoles(actorRole) {
  return ASSIGNABLE_ROLES[actorRole] || [];
}

export function canManageUser(actor, targetUser) {
  if (!actor || !targetUser || actor.id === targetUser.id) return false;
  const actorRank = ROLE_RANK[actor.role] || 0;
  const targetRank = ROLE_RANK[targetUser.role] || Number.POSITIVE_INFINITY;
  return actorRank > targetRank;
}
