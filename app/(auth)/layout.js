import React from 'react'

const AuthLayout = ({children}) => {
  return (
    <div>
      <div className='flex justify-center pt-40'>
        {children}
      </div>
    </div>
  )
}

export default AuthLayout
