export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override the main layout's pl-64 offset for the login page
  return (
    <div className="fixed inset-0 z-[9999] !pl-0 !ml-0 w-screen h-screen overflow-auto bg-gray-950">
      {children}
    </div>
  );
}
