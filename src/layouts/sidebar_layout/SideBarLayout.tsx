/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react'
import { FaChartBar, FaIdCard, FaSignOutAlt, FaTag, FaTimes, FaUser, FaWhmcs } from 'react-icons/fa'

interface Props {
  children?: React.ReactNode
}
export default function SideBarLayout({ children }: Props) {
  const [isOpen, setIsOpen] = useState(true)
  const year = new Date().getFullYear()
  return (
    <div className={`${isOpen ? 'flex min-h-screen' : ''}`}>
      <div
        className={`bg-white w-60 space-y-6 p-2 fixed max-h-screen inset-y-0 left-0 transform md:sticky border-r rounded-sm border-gray-400 flex flex-col justify-between ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className='m-0'>
          <a href='/'>
            <div className='mx-17'>
              <img src='/logo.png' alt='Workflow' className='w-30 h-25' />
            </div>
          </a>

          <a href='#' className='flex flex-col space-y-2 py-4 px-3 pt-0'>
            <span className='text-xl font-extrabold block'>Hi, Dat Trang</span>
            <span className='text-sm italic text-right pr-2'>Role: System</span>
          </a>

          <nav className='space-y-1'>
            <a href='#' className='flex py-2.5 px-4 rounded border-1 border-white  hover:border-gray-400'>
              <FaChartBar className='mr-2' />
              Dashboard
            </a>
            <a href='/account' className='flex py-2.5 px-4 rounded border-1 border-white  hover:border-gray-400'>
              <FaUser className='mr-2' />
              Account
            </a>
            <a href='/card' className='flex py-2.5 px-4 rounded border-1 border-white  hover:border-gray-400'>
              <FaIdCard className='mr-2' />
              Card
            </a>
            <a href='/promotion' className='flex py-2.5 px-4 rounded border-1 border-white  hover:border-gray-400'>
              <FaTag className='mr-2' />
              Promotion
            </a>
            <a href='#' className='flex py-2.5 px-4 rounded border-1 border-white  hover:border-gray-400'>
              <FaWhmcs className='mr-2' />
              Setting
            </a>
          </nav>
        </div>
        <div>
          <a href='/login' className='flex py-2.5 px-4 rounded border-1 border-white  hover:border-gray-400'>
            <FaSignOutAlt className='mr-2' />
            Sign out
          </a>
          <p className='mt-6 text-center text-[10px] text-gray-600'>© {year} Dat Trang. All Rights Reserved.</p>
        </div>
      </div>
      {/* <button onClick={() => setIsOpen(!isOpen)} className='text-gray-500 focus:outline-none fixed top-4 left-4 z-50'>
        {isOpen ? (
          <FaTimes className='w-6 h-6' /> // Close icon (X) when sidebar is open
        ) : (
          <FaBars className='w-6 h-6' /> // Hamburger icon (☰) when sidebar is closed
        )}
      </button> */}
      {/* Main Content */}
      {/* <div className={`${isOpen ? 'flex-1 px-10' : 'focus:outline-none fixed top-4 left-4 m-9 '}`}>{children}</div> */}
      <div className={`${isOpen ? 'flex-1 px-10' : 'fixed inset-0 flex items-center justify-center'}`}>{children}</div>
    </div>
  )
}
