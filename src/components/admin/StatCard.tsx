 import { ReactNode } from 'react';
 import { Card, CardContent } from '@/components/ui/card';
 import { cn } from '@/lib/utils';
 
 interface StatCardProps {
   title: string;
   value: string | number;
   icon: ReactNode;
   trend?: {
     value: number;
     isPositive: boolean;
   };
   className?: string;
 }
 
 const StatCard = ({ title, value, icon, trend, className }: StatCardProps) => {
   return (
     <Card className={cn('hover:shadow-lg transition-shadow', className)}>
       <CardContent className="p-6">
         <div className="flex items-start justify-between">
           <div className="space-y-2">
             <p className="text-sm font-medium text-muted-foreground">{title}</p>
             <p className="text-2xl font-bold">{value}</p>
             {trend && (
               <p className={cn(
                 'text-xs font-medium',
                 trend.isPositive ? 'text-primary' : 'text-destructive'
               )}>
                 {trend.isPositive ? '+' : ''}{trend.value}% from last month
               </p>
             )}
           </div>
           <div className="p-3 rounded-xl bg-primary/10 text-primary">
             {icon}
           </div>
         </div>
       </CardContent>
     </Card>
   );
 };
 
 export default StatCard;