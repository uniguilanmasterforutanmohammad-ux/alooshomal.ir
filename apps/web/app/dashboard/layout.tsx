import { UserShell } from '@/components/dashboard/UserShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserShell>{children}</UserShell>;
}
