import React, { Suspense } from 'react'
import DashboardPage from './page'
import { BarLoader } from 'react-spinners'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

const DashboardLayout = () => {
    return (
        <>
            <SignedIn>
                <div className='px-5'>
                    <h1 className='text-6xl font-bold gradient-title mb-5'>Dashboard</h1>

                    {/* Dashboard page */}
                    <Suspense 
                    fallback={<BarLoader className='mt-4' width={"100%"} color='#9333ea' />}
                    >
                        <DashboardPage />
                    </Suspense>
                </div>
            </SignedIn>

            <SignedOut>
                <SignInButton/>
            </SignedOut>
        </>
    )
}

export default DashboardLayout
