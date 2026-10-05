import * as React from "react";
import { cn } from "@/lib/utils";

interface TableContextValue {
  side: "left" | "right" | "none";
}

const TableContext = React.createContext<TableContextValue>({ side: "none" });

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { side?: "left" | "right" | "none" }
>(({ className, side = "none", ...props }, ref) => (
  <TableContext.Provider value={{ side }}>
    <table
      ref={ref}
      className={cn(
        "border-collapse w-full text-sm",
        side === "left" && "ml-0 mr-auto",
        side === "right" && "ml-auto mr-0",
        className
      )}
      {...props}
    />
  </TableContext.Provider>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn(className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("border-t border-border", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn(className)} {...props} />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }
>(({ className, hover, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border last:border-b-0 transition-colors",
      hover && "hover:bg-accent/5",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "text-muted font-medium h-10 px-4 text-left vertical-align-middle border-b border-border-strong align-middle whitespace-nowrap",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }
>(({ className, align = "left", ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 vertical-align-middle",
      align === "right" && "text-right tabular-nums",
      align === "center" && "text-center",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("text-muted text-sm p-4 text-left", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
