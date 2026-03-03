"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { urlForImage } from "@/sanity/lib/image"
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProjectGalleryProps {
    images: any[]
    title: string
}

export function ProjectGallery({ images, title }: ProjectGalleryProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setCurrentIndex((prev) => (prev + 1) % images.length)
    }

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    }

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext()
            if (e.key === "ArrowLeft") handlePrev()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen])

    return (
        <section id="gallery">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Visual Tour</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {images.map((img: any, index: number) => (
                    <div
                        key={index}
                        className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
                        onClick={() => {
                            setCurrentIndex(index)
                            setIsOpen(true)
                        }}
                    >
                        <Image
                            src={urlForImage(img).width(800).url()}
                            alt={`${title} gallery image ${index + 1}`}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px]">
                            <Badge className="bg-white text-black hover:bg-white/90 shadow-lg">Expand View</Badge>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-6xl bg-black/95 border-none shadow-none p-0 overflow-hidden ring-0">
                    <div className="relative flex h-[85vh] w-full flex-col items-center justify-center p-4">
                        {/* Close Button UI Overlook? DialogContent already has one, but let's make the background dark */}

                        {/* Main Image View */}
                        <div className="relative h-full w-full">
                            <Image
                                src={urlForImage(images[currentIndex]).width(2000).url()}
                                alt={`${title} large view ${currentIndex + 1}`}
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>

                        {/* Navigation Buttons */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:bg-white hover:text-black shadow-2xl z-50 border border-white/10"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft className="h-8 w-8" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:bg-white hover:text-black shadow-2xl z-50 border border-white/10"
                                    aria-label="Next image"
                                >
                                    <ChevronRight className="h-8 w-8" />
                                </button>
                            </>
                        )}

                        {/* Pagination / Context indicator */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                            <span className="text-white text-sm font-medium tracking-widest">
                                {currentIndex + 1} <span className="text-white/40">/</span> {images.length}
                            </span>
                        </div>

                        {/* Footer Thumbnails (Optional) */}
                        <div className="absolute bottom-6 left-0 right-0 px-6 overflow-x-auto no-scrollbar">
                            <div className="flex gap-2 justify-center py-2">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`relative h-12 w-20 flex-shrink-0 cursor-pointer rounded-md overflow-hidden border-2 transition-all ${currentIndex === idx ? "border-accent scale-110" : "border-white/20 opacity-50 hover:opacity-100"
                                            }`}
                                    >
                                        <Image
                                            src={urlForImage(img).width(200).url()}
                                            alt="thumbnail"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    )
}
