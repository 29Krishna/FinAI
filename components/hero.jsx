"use client"
import Link from 'next/link'
import React, { useEffect, useRef } from 'react'
import { Button } from './ui/button'
import Image from 'next/image'

const HeroSection = () => {
    const imageRef = useRef()

    useEffect(() => {
      const imageElement = imageRef.current;
      const handleScroll = () => {
        const scrollPosition = window.scrollY
        const scrollThreshhold = 100

        if(scrollPosition>scrollThreshhold){
            imageElement.classList.add("scrolled")
        }else{
            imageElement.classList.remove("scrolled")
        }
      }
      
      window.addEventListener("scroll", handleScroll)

      return () => {
        window.removeEventListener("scroll",handleScroll)
      }
      
    }, [])
    



    return (
        <div className='pb-20 px-4'>
            <div className='container mx-auto text-center flex flex-col gap-2'>
                <h1 className='text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title'>Manage your Finances <br /> with Intelligence</h1>
                <p className='text-xl text-gray-600 mb-8 max-w-2xl mx-auto'>
                    An AI-powered financial management platform that helps you track, analyze, and optimize your spending with real-time insights.
                </p>
                <div className='flex space-x-4 justify-center' >
                    <Link href="/dashboard">
                        <Button size="lg" className="px-8">Get Started</Button>
                    </Link>
                    <Link href="/">
                        <Button variant="outline" size="lg" className="px-8">Read Document</Button>
                    </Link>
                </div>
                <div className='hero-image-wrapper'>
                    <div ref={imageRef} className='hero-image'>
                        <Image src={"/banner.jpeg"} width={1100} height={650} alt='dashboard preview' priority
                            className='rounded-lg shadow-2xl border mx-auto' />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HeroSection
