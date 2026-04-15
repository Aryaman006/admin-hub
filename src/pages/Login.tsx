 import { useState } from 'react';
 import { useAuth } from '@/contexts/AuthContext';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { toast } from 'sonner';
 import { Loader2, Shield } from 'lucide-react';
 
 const Login = () => {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const { signIn } = useAuth();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
 
     try {
       await signIn(email, password);
       toast.success('Welcome back, Admin!');
     } catch (error: any) {
       toast.error(error.message || 'Failed to sign in');
     } finally {
       setIsLoading(false);
     }
   };
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
       <Card className="w-full max-w-md shadow-xl border-muted/50">
         <CardHeader className="text-center space-y-4">
           <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
             <Shield className="w-8 h-8 text-primary" />
           </div>
           <div>
             <CardTitle className="text-2xl font-bold">Playoga Admin</CardTitle>
             <CardDescription className="text-muted-foreground">
               Sign in to access the admin dashboard
             </CardDescription>
           </div>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="email">Email</Label>
               <Input
                 id="email"
                 type="email"
                 placeholder="admin@playoga.com"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
                 disabled={isLoading}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="password">Password</Label>
               <Input
                 id="password"
                 type="password"
                 placeholder="••••••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 required
                 disabled={isLoading}
               />
             </div>
             <Button type="submit" className="w-full" disabled={isLoading}>
               {isLoading ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Signing in...
                 </>
               ) : (
                 'Sign In'
               )}
             </Button>
           </form>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default Login;