// Use server time, so a learner's device clock cannot shift a group boundary.
export function accessWindowDelay(access){
  if(!Number.isFinite(access?.next_transition)||!Number.isFinite(access?.checked_at))return null;
  return Math.min(86400000,Math.max(1000,(access.next_transition-access.checked_at)*1000+500));
}
