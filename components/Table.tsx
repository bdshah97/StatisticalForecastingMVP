import React, { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'spacious';
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  isHighlighted?: boolean;
  onClick?: () => void;
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  isHeader?: boolean;
}

/**
 * Design System Table Component
 * Maps to SSA-theme-shadcn design tokens
 * 
 * Usage:
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableCell isHeader>SKU</TableCell>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>SKU-101</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */

const Table: React.FC<TableProps> = ({ children, className = '', variant = 'default' }) => {
  const variantClasses = {
    default: 'text-sm',
    compact: 'text-xs',
    spacious: 'text-base',
  };

  return (
    <div className={`overflow-x-auto rounded-lg border border-[var(--color-border)]`}>
      <table className={`w-full ${variantClasses[variant]} ${className}`}>
        {children}
      </table>
    </div>
  );
};

const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-[var(--color-secondary)] border-b border-[var(--color-border)] ${className}`}>
      {children}
    </thead>
  );
};

const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-[var(--color-border)] ${className}`}>
      {children}
    </tbody>
  );
};

const TableRow: React.FC<TableRowProps> = ({ children, className = '', isHighlighted = false, onClick }) => {
  return (
    <tr
      onClick={onClick}
      className={`
        transition-colors duration-200
        ${isHighlighted ? 'bg-[var(--color-warning-foreground)]' : 'hover:bg-[var(--color-muted)]'}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </tr>
  );
};

const TableCell: React.FC<TableCellProps> = ({ 
  children, 
  className = '', 
  align = 'left',
  isHeader = false 
}) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (isHeader) {
    return (
      <th
        className={`
          py-3 px-4
          font-bold
          text-[var(--color-foreground)]
          uppercase tracking-wider
          bg-[var(--color-secondary)]
          ${alignmentClasses[align]}
          ${className}
        `}
      >
        {children}
      </th>
    );
  }

  return (
    <td
      className={`
        py-3 px-4
        text-[var(--color-foreground)]
        ${alignmentClasses[align]}
        ${className}
      `}
    >
      {children}
    </td>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
