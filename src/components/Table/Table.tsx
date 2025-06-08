/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'

// Define the type for table columns
interface Column {
  key: string
  header: string
  width?: string // Optional width for columns
}

// Define the type for table data
interface TableProps {
  columns: Column[]
  data: Record<string, any>[] // Array of objects representing rows
  className?: string // Optional className for custom styling
}

const Table: React.FC<TableProps> = ({ columns, data, className }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className='min-w-full bg-white border border-gray-300'>
        {/* Table Header */}
        <thead>
          <tr className='bg-gray-200'>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width ? column.width : ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className='divide-y divide-gray-200'>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className='hover:bg-gray-50 transition-colors'>
              {columns.map((column) => (
                <td key={column.key} className='px-6 py-4 text-sm text-gray-900'>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
