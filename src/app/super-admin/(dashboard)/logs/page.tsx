

import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/server/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 20;

interface LogsPageProps {
    searchParams: {
        page?: string;
    };
}

function JsonViewer({ data }: { data: any }) {
    if (!data) return null;
    return (
        <ScrollArea className="max-h-60 w-full rounded-md border bg-muted/50 p-4">
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
        </ScrollArea>
    );
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
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">User</TableHead>
                                <TableHead className="w-[150px]">Action</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[120px]">IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <Accordion key={log.id} type="single" collapsible asChild>
                                     <TableRow>
                                        <TableCell colSpan={5} className="p-0">
                                            <AccordionItem value={`item-${log.id}`} className="border-b-0">
                                                <AccordionTrigger className="p-4 hover:no-underline">
                                                    <div className="w-[180px] text-left text-xs text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(log.createdAt), 'PPP p')}
                                                    </div>
                                                    <div className="w-[150px] text-left">
                                                        {log.userName || 'System'}
                                                        {log.userRole && (
                                                            <Badge variant="secondary" className="ml-2">{log.userRole}</Badge>
                                                        )}
                                                    </div>
                                                    <div className="w-[150px] text-left">
                                                        <Badge variant={log.actionType.includes('_FAIL') || log.actionType.includes('UNAUTHORIZED') ? "destructive" : "outline"}>
                                                            {log.actionType}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex-1 text-left text-sm">{log.description}</div>
                                                    <div className="w-[120px] text-left font-mono text-xs">{log.ipAddress || 'N/A'}</div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-4 bg-muted/30">
                                                    <h4 className="font-semibold mb-2">Action Details</h4>
                                                    {log.details ? (
                                                        <JsonViewer data={log.details} />
                                                    ): (
                                                        <p className="text-sm text-muted-foreground">No additional details were recorded for this event.</p>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        </TableCell>
                                     </TableRow>
                                </Accordion>
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
                                    <PaginationPrevious aria-disabled={true} className="pointer-events-none opacity-50" />
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
                                    <PaginationNext aria-disabled={true} className="pointer-events-none opacity-50" />
                                )}
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </CardContent>
        </Card>
    );
}
