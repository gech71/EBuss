
import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/server/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import Link from 'next/link';

const ITEMS_PER_PAGE = 20;

interface LogsPageProps {
    searchParams: {
        page?: string;
    };
}

export default async function AuditLogsPage({ searchParams }: LogsPageProps) {
    const { user } = await validateRequest();
    if (!user || user.role !== 'SUPER_ADMIN') {
        redirect('/super-admin/login');
    }

    const page = Number(searchParams.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const [logs, totalLogs] = await prisma.$transaction([
        prisma.auditLog.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            take: ITEMS_PER_PAGE,
            skip: skip,
        }),
        prisma.auditLog.count(),
    ]);

    const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>A record of all significant events that have occurred in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {format(new Date(log.createdAt), 'PPP p')}
                                    </TableCell>
                                    <TableCell>
                                        {log.userName || 'System'}
                                        {log.userRole && (
                                            <Badge variant="secondary" className="ml-2">{log.userRole}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{log.actionType}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{log.description}</TableCell>
                                    <TableCell className="font-mono text-xs">{log.ipAddress || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                             {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No audit logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 {totalPages > 1 && (
                    <Pagination className="mt-6">
                        <PaginationContent>
                            <PaginationItem>
                                {page > 1 ? (
                                     <Link href={`/super-admin/logs?page=${page - 1}`} passHref>
                                        <PaginationPrevious />
                                     </Link>
                                ) : (
                                    <PaginationPrevious disabled />
                                )}
                            </PaginationItem>
                            <PaginationItem>
                                <span className="font-medium text-sm p-2">Page {page} of {totalPages}</span>
                            </PaginationItem>
                            <PaginationItem>
                                 {page < totalPages ? (
                                     <Link href={`/super-admin/logs?page=${page + 1}`} passHref>
                                        <PaginationNext />
                                     </Link>
                                ) : (
                                    <PaginationNext disabled />
                                )}
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </CardContent>
        </Card>
    );
}
