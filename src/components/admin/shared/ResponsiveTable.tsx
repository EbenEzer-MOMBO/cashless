import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ResponsiveTableProps {
  title: string;
  description?: string;
  count?: number;
  headers: string[];
  children: ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable({ 
  title, 
  description, 
  count, 
  headers, 
  children, 
  loading = false,
  emptyMessage = "Aucune donnée disponible",
  className = ""
}: ResponsiveTableProps) {
  return (
    <Card className={`flex-1 min-h-0 ${className}`}>
      <CardHeader className="mobile-card shrink-0">
        <CardTitle className="mobile-text">
          {title} {count !== undefined && `(${count})`}
        </CardTitle>
        {description && (
          <CardDescription className="mobile-text">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="overflow-auto h-full">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header, index) => (
                    <TableHead key={index} className="text-xs sm:text-sm whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={headers.length} className="text-center py-8 mobile-text">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : (
                  children
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}