 import { ReactNode } from 'react';
 import AdminSidebar from './AdminSidebar';
 
 interface AdminLayoutProps {
   children: ReactNode;
 }
 
 const AdminLayout = ({ children }: AdminLayoutProps) => {
   return (
     <div className="flex min-h-screen w-full bg-background">
       <AdminSidebar />
       <main className="flex-1 overflow-auto">
         <div className="p-4 md:p-6 lg:p-8">
           {children}
         </div>
       </main>
     </div>
   );
 };
 
 export default AdminLayout;