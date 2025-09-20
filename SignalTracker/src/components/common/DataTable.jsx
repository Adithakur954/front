import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const DataTable = ({ columns, data }) => {
    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow key={row.id || rowIndex}>
                            {columns.map((column) => (
                                <TableCell key={column.accessor || column.header}>

                                    {column.render ? column.render(row, rowIndex) : row[column.accessor]}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data && data.length > 0 ? (
                            data.map((row, rowIndex) => (
                                <TableRow key={row.id || rowIndex}>
                                    {columns.map((column) => (
                                        <TableCell key={column.accessor || column.header}>
                                            {/* This is the corrected line */}
                                            {column.render ? column.render(row, rowIndex) : row[column.accessor]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default DataTable;