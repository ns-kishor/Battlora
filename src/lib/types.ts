// ============================================================
// Battlora — domain types, status codes, labels, permissions
// (SQLite has no enums — string codes are validated here)
// ============================================================

export type Role =
  | "SUPER_ADMIN"
  | "TOURNAMENT_ADMIN"
  | "MODERATOR"
  | "RESULT_MANAGER"
  | "FINANCE"
  | "CAPTAIN"
  | "PLAYER";

export const ROLES: Role[] = [
  "SUPER_ADMIN",
  "TOURNAMENT_ADMIN",
  "MODERATOR",
  "RESULT_MANAGER",
  "FINANCE",
  "CAPTAIN",
  "PLAYER",
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  TOURNAMENT_ADMIN: "Tournament Admin",
  MODERATOR: "Moderator",
  RESULT_MANAGER: "Result Manager",
  FINANCE: "Finance Manager",
  CAPTAIN: "Team Captain",
  PLAYER: "Player",
};

export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "UPCOMING"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  "DRAFT",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "UPCOMING",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
];

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Registration Closed",
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export type RegistrationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PAYMENT_PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "BANNED";

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PAYMENT_PENDING: "Payment Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  BANNED: "Banned",
};

export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "REFUNDED";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
};

export type MatchStatus =
  | "SCHEDULED"
  | "ROOM_OPEN"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "POSTPONED";

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "Scheduled",
  ROOM_OPEN: "Room Open",
  LIVE: "Live",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  POSTPONED: "Postponed",
};

export type ComplaintStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "CONFIRMED"
  | "REJECTED"
  | "RESOLVED";

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
};

export type ComplaintType =
  | "HACK_CHEAT"
  | "TEAMING"
  | "BUG_ABUSE"
  | "ACCOUNT_ISSUE"
  | "WRONG_RESULT"
  | "PLAYER_ISSUE"
  | "OTHER";

export const COMPLAINT_TYPES: { value: ComplaintType; label: string }[] = [
  { value: "HACK_CHEAT", label: "Hack / Cheat" },
  { value: "TEAMING", label: "Teaming" },
  { value: "BUG_ABUSE", label: "Bug Abuse" },
  { value: "ACCOUNT_ISSUE", label: "Account Issue" },
  { value: "WRONG_RESULT", label: "Wrong Result" },
  { value: "PLAYER_ISSUE", label: "Player Issue" },
  { value: "OTHER", label: "Other" },
];

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  HACK_CHEAT: "Hack / Cheat",
  TEAMING: "Teaming",
  BUG_ABUSE: "Bug Abuse",
  ACCOUNT_ISSUE: "Account Issue",
  WRONG_RESULT: "Wrong Result",
  PLAYER_ISSUE: "Player Issue",
  OTHER: "Other",
};

export type PenaltyType =
  | "WARNING"
  | "POINT_DEDUCTION"
  | "KILL_DEDUCTION"
  | "MATCH_LOSS"
  | "PRIZE_DEDUCTION"
  | "DISQUALIFICATION"
  | "TOURNAMENT_BAN";

export const PENALTY_TYPES: { value: PenaltyType; label: string }[] = [
  { value: "WARNING", label: "Warning" },
  { value: "POINT_DEDUCTION", label: "Point Deduction" },
  { value: "KILL_DEDUCTION", label: "Kill Deduction" },
  { value: "MATCH_LOSS", label: "Match Loss" },
  { value: "PRIZE_DEDUCTION", label: "Prize Deduction" },
  { value: "DISQUALIFICATION", label: "Disqualification" },
  { value: "TOURNAMENT_BAN", label: "Tournament Ban" },
];

export const PENALTY_TYPE_LABELS: Record<PenaltyType, string> = {
  WARNING: "Warning",
  POINT_DEDUCTION: "Point Deduction",
  KILL_DEDUCTION: "Kill Deduction",
  MATCH_LOSS: "Match Loss",
  PRIZE_DEDUCTION: "Prize Deduction",
  DISQUALIFICATION: "Disqualification",
  TOURNAMENT_BAN: "Tournament Ban",
};

export type AnnouncementPriority = "NORMAL" | "IMPORTANT" | "URGENT";

export const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  NORMAL: "Normal",
  IMPORTANT: "Important",
  URGENT: "Urgent",
};

export type PrizeStatus = "PENDING" | "APPROVED" | "PAID";

export const PRIZE_STATUS_LABELS: Record<PrizeStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
};

// ---------- Prize withdrawal (PRD: prize payout workflow) ----------

export type WithdrawalStatus =
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PAYMENT_PROCESSING"
  | "PAID"
  | "REJECTED"
  | "REQUIRES_CORRECTION";

export const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  "UNDER_REVIEW",
  "APPROVED",
  "PAYMENT_PROCESSING",
  "PAID",
  "REJECTED",
  "REQUIRES_CORRECTION",
];

export const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  NOT_SUBMITTED: "Not Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  PAYMENT_PROCESSING: "Payment Processing",
  PAID: "Paid",
  REJECTED: "Rejected",
  REQUIRES_CORRECTION: "Requires Correction",
};

/** Mobile wallet methods accepted for prize payouts (spec §2.4) */
export const WITHDRAWAL_METHODS = ["bKash", "Nagad", "Upay", "Rocket"] as const;

export type WithdrawalMethod = (typeof WITHDRAWAL_METHODS)[number];

export const POSITION_LABELS: Record<number, string> = {
  1: "1st Place",
  2: "2nd Place",
  3: "3rd Place",
};

export const POSITION_MEDALS: Record<number, string> = {
  1: "\uD83E\uDD47", // 🥇
  2: "\uD83E\uDD48", // 🥈
  3: "\uD83E\uDD49", // 🥉
};

/** Withdrawal timeline event labels (shared by winner + admin views) */
export const WITHDRAWAL_EVENT_LABELS: Record<string, string> = {
  SUBMITTED: "Request submitted",
  RESUBMITTED: "Corrected details resubmitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CORRECTION_REQUESTED: "Correction requested",
  PAYMENT_PROCESSING: "Payment processing",
  PAID: "Prize paid",
  REOPENED: "Reopened by admin",
  NOTE: "Internal note",
};

export type TeamStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "BANNED";

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
};

export type PlayerStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "BANNED";

export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
};

export const PLAYER_ROLES = [
  "IGL",
  "RUSHER",
  "SNIPER",
  "SUPPORT",
  "SCOUT",
  "PLAYER",
] as const;

export const MAPS = ["Bermuda", "Purgatory", "Kalahari", "Alpine", "Nexterra"] as const;

export const GAME_MODES = ["Solo", "Duo", "Squad", "Clash Squad"] as const;

export type ScoringConfig = {
  placementPoints: Record<string, number>;
  killPoint: number;
};

export const DEFAULT_SCORING: ScoringConfig = {
  placementPoints: {
    "1": 12,
    "2": 9,
    "3": 8,
    "4": 7,
    "5": 6,
    "6": 5,
    "7": 4,
    "8": 3,
    "9": 2,
    "10": 1,
    default: 0,
  },
  killPoint: 1,
};

export type TieBreakKey =
  | "TOTAL_POINTS"
  | "FIRST_PLACES"
  | "TOTAL_KILLS"
  | "BEST_PLACEMENT"
  | "LATEST_MATCH";

export const TIE_BREAK_LABELS: Record<TieBreakKey, string> = {
  TOTAL_POINTS: "Total Points",
  FIRST_PLACES: "Number of 1st Places (Booyah)",
  TOTAL_KILLS: "Total Kills",
  BEST_PLACEMENT: "Best Match Placement",
  LATEST_MATCH: "Latest Match Performance",
};

export type PaymentMethod = { name: string; number: string; type: string };

export type FAQ = { q: string; a: string };

export type RuleItem = {
  type: "paragraph" | "bullets" | "numbered" | "notice" | "warning";
  text: string;
};

export type RuleSection = {
  category: string;
  items: RuleItem[];
};

// ============================================================
// RBAC — Permission matrix (PRD section 40)
// ============================================================

export type Permission =
  | "tournaments.manage"
  | "tournaments.view"
  | "teams.manage"
  | "teams.view"
  | "players.manage"
  | "players.view"
  | "matches.manage"
  | "matches.view"
  | "results.manage"
  | "results.view"
  | "payments.manage"
  | "payments.view"
  | "complaints.manage"
  | "complaints.view"
  | "penalties.manage"
  | "announcements.manage"
  | "users.manage"
  | "users.view"
  | "activity.view"
  | "settings.manage"
  | "settings.view"
  | "complaints.submit"
  | "team.manage-own";

const PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "tournaments.manage", "tournaments.view",
    "teams.manage", "teams.view",
    "players.manage", "players.view",
    "matches.manage", "matches.view",
    "results.manage", "results.view",
    "payments.manage", "payments.view",
    "complaints.manage", "complaints.view",
    "penalties.manage",
    "announcements.manage",
    "users.manage", "users.view",
    "activity.view",
    "settings.manage", "settings.view",
    "complaints.submit", "team.manage-own",
  ],
  TOURNAMENT_ADMIN: [
    "tournaments.manage", "tournaments.view",
    "teams.manage", "teams.view",
    "players.manage", "players.view",
    "matches.manage", "matches.view",
    "results.manage", "results.view",
    "payments.view",
    "complaints.manage", "complaints.view",
    "penalties.manage",
    "announcements.manage",
    "users.view",
    "activity.view",
    "settings.view",
    "complaints.submit", "team.manage-own",
  ],
  MODERATOR: [
    "tournaments.view",
    "teams.view",
    "players.manage", "players.view",
    "matches.view",
    "complaints.manage", "complaints.view",
    "complaints.submit", "team.manage-own",
  ],
  RESULT_MANAGER: [
    "tournaments.view",
    "teams.view",
    "matches.manage", "matches.view",
    "results.manage", "results.view",
    "complaints.submit", "team.manage-own",
  ],
  FINANCE: [
    "tournaments.view",
    "payments.manage", "payments.view",
    "complaints.submit", "team.manage-own",
  ],
  CAPTAIN: [
    "tournaments.view",
    "teams.view",
    "complaints.submit",
    "team.manage-own",
  ],
  PLAYER: [
    "tournaments.view",
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = PERMISSIONS[role as Role];
  return !!perms && perms.includes(permission);
}

export function isStaffRole(role: string): boolean {
  return ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "MODERATOR", "RESULT_MANAGER", "FINANCE"].includes(
    role
  );
}
