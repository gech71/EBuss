
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Users, Eye, EyeOff } from "lucide-react";

export default function SuperAdminSettingsPage() {
    const { owners, users, addUser } = useData();
    const { toast } = useToast();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [ownerId, setOwnerId] = useState('');

    const realOwners = owners.filter(o => o.id !== 'super-admin' && o.id !== 'customer');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !email || !password || !ownerId) {
            toast({
                title: "Missing Fields",
                description: "Please fill out all fields to create a user.",
                variant: "destructive"
            });
            return;
        }
        addUser({ name, email, ownerId }, password);
        toast({
            title: "User Created",
            description: `${name} has been added and assigned to an owner.`
        });
        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        setShowPassword(false);
        setOwnerId('');
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New User</CardTitle>
                    <CardDescription>
                    Create a new administrative user and assign them to a bus owner.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Jane Doe" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g., jane.doe@example.com"/>
                            </div>
                        </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input 
                                        id="password" 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        placeholder="Enter a secure password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        <span className="sr-only">
                                            {showPassword ? "Hide password" : "Show password"}
                                        </span>
                                    </Button>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="owner">Assign to Bus Owner</Label>
                                <Select value={ownerId} onValueChange={setOwnerId}>
                                    <SelectTrigger id="owner">
                                        <SelectValue placeholder="Select a bus owner..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {realOwners.map(owner => (
                                            <SelectItem key={owner.id} value={owner.id}>
                                                {owner.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                       </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Users</CardTitle>
                    <CardDescription>
                        A list of all administrative users on the platform.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Assigned Owner</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => {
                                const owner = owners.find(o => o.id === user.ownerId);
                                if (user.ownerId === 'super-admin' || user.ownerId === 'customer') return null;
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{owner?.name || 'N/A'}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    {users.filter(u => u.ownerId !== 'super-admin' && u.ownerId !== 'customer').length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            <Users className="mx-auto h-12 w-12" />
                            <p className="mt-4">No admin users have been created yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
