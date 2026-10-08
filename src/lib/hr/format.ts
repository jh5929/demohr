export function rm(value: number | string | null | undefined): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatMinutes(minutes: number): string {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function formatDays(days: number): string {
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

export function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function monthLabel(period: string): string {
  const [year, month] = period.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[Number(month) - 1]} ${year}`;
}
