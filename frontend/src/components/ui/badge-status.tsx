import { cn } from "@/lib/utils";

export type BookingStatus = 
  | "requested" 
  | "assigned" 
  | "enroute" 
  | "arrived" 
  | "pickedup"
  | "completed" 
  | "cancelled";

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  requested: { 
    label: "Requested", 
    className: "bg-[hsl(var(--status-requested))] text-white"
  },
  assigned: { 
    label: "Driver Assigned", 
    className: "bg-[hsl(var(--status-assigned))] text-white"
  },
  enroute: { 
    label: "En Route", 
    className: "bg-[hsl(var(--status-enroute))] text-white"
  },
  arrived: { 
    label: "Driver Arrived", 
    className: "bg-[hsl(var(--status-arrived))] text-white"
  },
  pickedup: { 
    label: "Patient Picked Up", 
    className: "bg-[hsl(var(--status-arrived))] text-white"
  },
  completed: { 
    label: "Completed", 
    className: "bg-[hsl(var(--status-completed))] text-white"
  },
  cancelled: { 
    label: "Cancelled", 
    className: "bg-[hsl(var(--status-cancelled))] text-white"
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-all",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
