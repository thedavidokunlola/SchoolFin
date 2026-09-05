// src/types/lucide-react.d.ts
// Ambient module declaration for lucide-react icons

declare module "lucide-react" {
  import * as React from "react";

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Shield: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const Users: LucideIcon;
  export const User: LucideIcon;
  export const UserPlus: LucideIcon;
  export const UserCheck: LucideIcon;
  export const UserX: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Calendar: LucideIcon;
  export const FileText: LucideIcon;
  export const FileSpreadsheet: LucideIcon;
  export const Plus: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const PauseCircle: LucideIcon;
  export const PlayCircle: LucideIcon;
  export const Search: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Printer: LucideIcon;
  export const Receipt: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const X: LucideIcon;
  export const LogOut: LucideIcon;
  export const Download: LucideIcon;
  export const Lock: LucideIcon;
  export const Mail: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const KeyRound: LucideIcon;
  export const Check: LucideIcon;
  export const Trash2: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Phone: LucideIcon;
  export const Clock: LucideIcon;
  export const Link: LucideIcon;
  export const Copy: LucideIcon;
  export const Filter: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const EyeClosed: LucideIcon;
  export const Edit2: LucideIcon;
  export const Edit: LucideIcon;
  export const Pencil: LucideIcon;
  export const Building: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Settings: LucideIcon;
  export const RefreshCw: LucideIcon;
}
